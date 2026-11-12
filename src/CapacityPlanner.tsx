import { useState } from 'react';
import { Calculator, ChevronDown, CircleAlert, Cloud, Cpu, Gauge, HardDrive, Network } from 'lucide-react';
import { capacityInputs, defaults, scenarios, size } from './capacity';
import type { Capacity } from './capacity';

const num = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const quantity = (n: number) => n > 0 && n < 0.01 ? '<0.01' : num.format(n);
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export default function CapacityPlanner() {
  const [scenario, setScenario] = useState<keyof typeof scenarios | 'Custom'>('Pilot');
  const [inputs, setInputs] = useState<Record<keyof Capacity, string>>(() => strings(defaults));
  const numeric = Object.fromEntries(capacityInputs.map(({ key }) => [key, Number(inputs[key])])) as Capacity;
  const invalid = capacityInputs.some(({ key, min, max, step }) => !inputs[key].trim() || !Number.isFinite(numeric[key]) || numeric[key] < min || numeric[key] > max || (step === 1 && !Number.isInteger(numeric[key])));
  const result = invalid ? null : size(numeric);
  const modes = result && [
    { name: 'Edge CPU', icon: Cpu, workers: result.edgeCPU.workers, detail: `${quantity(result.edgeCPU.perSite)} per site · ${quantity(result.edgeCPU.effectiveFPS)} usable fps/site`, bandwidth: result.eventGB, stored: result.edgeRetention, time: result.frames > 0 ? 'Live during capture' : 'No camera load', cost: result.edgeCPU.cost },
    { name: 'Local GPU', icon: Cpu, workers: result.edgeGPU.workers, detail: `${quantity(result.edgeGPU.perSite)} per site · ${quantity(result.edgeGPU.effectiveFPS)} usable fps/site`, bandwidth: result.eventGB, stored: result.edgeRetention, time: result.frames > 0 ? 'Live during capture' : 'No camera load', cost: result.edgeGPU.cost },
    { name: 'Cloud CPU', icon: Cloud, workers: result.cloudCPU?.workers, detail: result.cloudCPU && `${quantity(result.cloudCPU.billed)} billed h/day per worker`, bandwidth: result.rawGB, stored: result.cloudRetention, time: !result.frames ? 'No camera load' : result.cloudCPU ? `${quantity(result.cloudCPU.runtime)} h + startup` : 'Window exhausted', cost: result.cloudCPU?.cost },
    { name: 'Cloud GPU', icon: Cloud, workers: result.cloudGPU?.workers, detail: result.cloudGPU && `${quantity(result.cloudGPU.billed)} billed h/day · ${quantity(result.cloudGPU.busyPct)}% busy across window`, bandwidth: result.rawGB, stored: result.cloudRetention, time: !result.frames ? 'No camera load' : result.cloudGPU ? `${quantity(result.cloudGPU.runtime)} h + startup` : 'Window exhausted', cost: result.cloudGPU?.cost },
  ];
  const maxCost = modes ? Math.max(1, ...modes.map(mode => mode.cost ?? 0)) : 1;

  function strings(values: Capacity): Record<keyof Capacity, string> {
    return Object.fromEntries(capacityInputs.map(({ key }) => [key, String(values[key])])) as Record<keyof Capacity, string>;
  }

  function fields(start: number, end?: number) {
    return <div className="input-grid">{capacityInputs.slice(start, end).map(({ key, label, unit, min, max, step }) => <label key={key} htmlFor={key}>{label}
      <span><input id={key} type="number" inputMode={step < 1 ? 'decimal' : 'numeric'} min={min} max={max} step={step === 1 ? 1 : 'any'} value={inputs[key]} onChange={e => { setScenario('Custom'); setInputs({ ...inputs, [key]: e.target.value }); }} /><small>{unit}</small></span>
    </label>)}</div>;
  }

  return <div className="capacity-panel">
    <div className="capacity-head"><div className="micro"><Calculator size={16} /> ILLUSTRATIVE ASSUMPTIONS</div><div className="segments" aria-label="Capacity presets">
      {(Object.keys(scenarios) as (keyof typeof scenarios)[]).map(key => <button key={key} aria-pressed={scenario === key} onClick={() => { setScenario(key); setInputs(strings(scenarios[key])); }}>{key}</button>)}
    </div></div>
    <div className="capacity-body">
      <div className="capacity-form">
        <h3>Site footprint & capture</h3>
        {fields(0, 6)}
        <details><summary>Throughput, utilization & event assumptions <ChevronDown size={15} /></summary>{fields(6, 15)}</details>
        <details><summary>Retention, network, pricing & sampling <ChevronDown size={15} /></summary>{fields(15)}</details>
      </div>
      <div className="capacity-output" aria-live="polite">
        {result ? <>
          <div className="metric-grid">
            <div><Gauge size={18} /><strong>{compact.format(result.frames)}</strong><small>Sampled frames / day</small></div>
            <div><HardDrive size={18} /><strong>{quantity(result.rawGB)} GB</strong><small>Raw frame payload / day</small></div>
            <div><Network size={18} /><strong>{quantity(result.aggregateFPS)} fps</strong><small>Fleet rate over cloud window</small></div>
            <div><Cpu size={18} /><strong>{compact.format(result.events)}</strong><small>Crossing events / day</small></div>
          </div>
          <p>{quantity(result.siteCount)} {result.siteCount === 1 ? 'site' : 'sites'} · {quantity(result.cameraCount)} {result.cameraCount === 1 ? 'camera' : 'cameras'} · {quantity(result.liveSiteFPS)} live fps/site.</p>
          <p>Cloud upload needs {quantity(result.siteMbps)} Mbps/site live, or {quantity(result.aggregateUploadMbps)} Mbps if all sites overlap. At the assumed link rate, a day of frames takes {quantity(result.uploadHours)} h/site to transfer in isolation.</p>
          {result.siteMbps > numeric.link && <div className="inline-note"><CircleAlert size={16} /> Live frame upload exceeds the assumed link. Buffer and account for upload latency, or process at the edge.</div>}
          {result.frames > 0 && result.usefulWindow === 0 && <div className="inline-note"><CircleAlert size={16} /> Startup consumes the full cloud window.</div>}
        </> : <div className="inline-note" role="alert"><CircleAlert size={16} /> Enter a value within the allowed range for each input. Counts require whole numbers.</div>}
      </div>
    </div>
    {modes && result && <div className="capacity-comparison">
      <h3>Edge vs. cloud inference</h3>
      <div className="comparison-grid">{modes.map(mode => {
        const Icon = mode.icon;
        return <article className="cost-card" key={mode.name}><h4><Icon size={16} /> {mode.name}</h4>
          <strong>{mode.cost === undefined ? 'Unavailable' : usd.format(mode.cost)} {mode.cost !== undefined && <small>/ mo</small>}</strong>
          <div className="cost-bar" aria-hidden="true"><span style={{ width: `${(mode.cost ?? 0) / maxCost * 100}%` }} /></div>
          <dl><dt>Concurrent workers</dt><dd>{mode.workers === undefined ? '—' : quantity(mode.workers)}</dd><dt>Transfer / day</dt><dd>{quantity(mode.bandwidth)} GB</dd><dt>Retained evidence</dt><dd>{quantity(mode.stored)} GB</dd><dt>Processing</dt><dd>{mode.time}</dd></dl>
          {mode.detail && <p>{mode.detail}</p>}
        </article>;
      })}</div>
      {result.frames > 0 && <p className="recall-note"><strong>Sampling sensitivity.</strong> At {numeric.fps} fps and {numeric.transit} s visible, the ideal probability of at least one sample is {num.format(result.sampleChance * 100)}%. Tracking may need multiple frames. Measure crossing recall (observed true crossings / all labeled crossings) and precision (true detections / all reported crossings) across lighting, occlusion and traffic.</p>}
    </div>}
    <details className="formulas"><summary>Equations, units & exclusions <ChevronDown size={15} /></summary>
      <ul>
        <li><code>frames/day = tenants × sites/tenant × cameras/site × fps × active hours × 3600</code></li>
        <li><code>edge workers/site = ceil(site fps ÷ (worker fps × utilization))</code></li>
        <li><code>cloud workers = ceil(frames ÷ (worker fps × useful seconds × utilization))</code>. Useful seconds exclude warm-up and teardown. Upload time is modeled separately. If upload and inference cannot overlap, budget them sequentially.</li>
        <li><code>events/day = cameras × active hours × crossings/camera-hour × events/crossing</code>. Edge retains event metadata. Cloud adds the selected sampled-frame fraction. Frame and event sizes use decimal kB and GB.</li>
        <li><code>monthly cost = common allowance + compute + 30 × daily GB × transfer price + retained GB × storage rate</code>. Edge compute is amortized. Cloud compute uses the greater of runtime plus startup and the idle billing floor, multiplied by 30 days.</li>
      </ul>
      <p>Rates are editable scenarios, not Azure quotes or measurements. Throughput must include decode, resolution, model, batching and hardware effects. Costs exclude protocol overhead, redundancy, staff, taxes and any platform services beyond the allowance. The ideal sampling proxy assumes random crossing phase and regularly spaced frames.</p>
    </details>
  </div>;
}

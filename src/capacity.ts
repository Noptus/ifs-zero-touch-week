export const capacityInputs = [
  { key: 'tenants', label: 'Customer tenants', unit: 'tenants', min: 1, max: 10000, step: 1 },
  { key: 'sites', label: 'Sites per tenant', unit: 'sites', min: 1, max: 1000, step: 1 },
  { key: 'cameras', label: 'Cameras per site', unit: 'cameras', min: 0, max: 1000, step: 1 },
  { key: 'hours', label: 'Active camera hours', unit: 'h/day', min: 0, max: 24, step: 0.5 },
  { key: 'fps', label: 'Sample rate', unit: 'fps/camera', min: 0.1, max: 60, step: 0.1 },
  { key: 'frameKB', label: 'Average sampled frame', unit: 'kB', min: 1, max: 10000, step: 1 },
  { key: 'edgeCPU', label: 'Edge CPU throughput', unit: 'fps/worker', min: 0.1, max: 10000, step: 0.1 },
  { key: 'edgeGPU', label: 'Local GPU throughput', unit: 'fps/worker', min: 0.1, max: 10000, step: 0.1 },
  { key: 'cloudCPU', label: 'Cloud CPU throughput', unit: 'fps/worker', min: 0.1, max: 10000, step: 0.1 },
  { key: 'cloudGPU', label: 'Cloud GPU throughput', unit: 'fps/worker', min: 0.1, max: 10000, step: 0.1 },
  { key: 'window', label: 'Cloud processing window', unit: 'h/day', min: 0.1, max: 24, step: 0.1 },
  { key: 'util', label: 'Target utilization', unit: '%', min: 1, max: 100, step: 1 },
  { key: 'crossings', label: 'Detected crossings', unit: 'per camera/h', min: 0, max: 10000, step: 1 },
  { key: 'events', label: 'Events per crossing', unit: 'events', min: 0, max: 20, step: 1 },
  { key: 'eventKB', label: 'Event size', unit: 'kB', min: 0.1, max: 1000, step: 0.1 },
  { key: 'retention', label: 'Evidence retention', unit: 'days', min: 0, max: 365, step: 1 },
  { key: 'framePct', label: 'Cloud frames retained', unit: '%', min: 0, max: 100, step: 0.1 },
  { key: 'link', label: 'Site upload link', unit: 'Mbps/site', min: 0.1, max: 100000, step: 0.1 },
  { key: 'network', label: 'Transfer cost', unit: 'USD/GB', min: 0, max: 100, step: 0.01 },
  { key: 'storage', label: 'Storage cost', unit: 'USD/GB-mo', min: 0, max: 100, step: 0.001 },
  { key: 'cpuPrice', label: 'Cloud CPU price', unit: 'USD/worker-h', min: 0, max: 1000, step: 0.01 },
  { key: 'gpuPrice', label: 'Cloud GPU price', unit: 'USD/worker-h', min: 0, max: 1000, step: 0.01 },
  { key: 'edgePrice', label: 'Edge CPU amortization', unit: 'USD/worker-mo', min: 0, max: 100000, step: 1 },
  { key: 'edgeGpuPrice', label: 'Local GPU amortization', unit: 'USD/worker-mo', min: 0, max: 100000, step: 1 },
  { key: 'basePrice', label: 'Shared platform allowance', unit: 'USD/mo', min: 0, max: 1000000, step: 1 },
  { key: 'warmup', label: 'Cloud start / teardown allowance', unit: 'min/day', min: 0, max: 1440, step: 1 },
  { key: 'billingFloor', label: 'Billed idle floor', unit: 'h/day', min: 0, max: 24, step: 0.1 },
  { key: 'transit', label: 'Visible time in crossing zone', unit: 'seconds', min: 0.1, max: 120, step: 0.1 },
] as const;

export type Capacity = Record<typeof capacityInputs[number]['key'], number>;
export const defaults: Capacity = {
  tenants: 1, sites: 1, cameras: 2, hours: 10, fps: 2, frameKB: 90,
  edgeCPU: 12, edgeGPU: 72, cloudCPU: 24, cloudGPU: 120, window: 3, util: 70,
  crossings: 12, events: 1, eventKB: 1, retention: 7, framePct: 0, link: 20,
  network: 0.04, storage: 0.025, cpuPrice: 0.2, gpuPrice: 1.8, edgePrice: 36,
  edgeGpuPrice: 95, basePrice: 65, warmup: 10, billingFloor: 0, transit: 0.6,
};
export const scenarios = {
  Pilot: defaults,
  Fleet: { ...defaults, tenants: 30, sites: 8, cameras: 6, basePrice: 1800 },
  'Camera-free': { ...defaults, cameras: 0 },
};

export function size(input: Capacity) {
  const siteCount = input.tenants * input.sites;
  const cameraCount = siteCount * input.cameras;
  const frames = cameraCount * input.fps * input.hours * 3600;
  const rawGB = frames * input.frameKB / 1e6;
  const events = cameraCount * input.hours * input.crossings * input.events;
  const eventGB = events * input.eventKB / 1e6;
  const edgeRetention = eventGB * input.retention;
  const cloudRetention = edgeRetention + rawGB * input.framePct / 100 * input.retention;
  const liveSiteFPS = frames > 0 ? input.cameras * input.fps : 0;
  const siteMbps = liveSiteFPS * input.frameKB * 0.008;
  const uploadHours = (rawGB / siteCount) * 8000 / input.link / 3600;
  const usefulWindow = Math.max(0, input.window - input.warmup / 60);
  const aggregateFPS = frames === 0 ? 0 : frames / (input.window * 3600);
  const util = input.util / 100;
  const sharedCost = input.basePrice;

  function edge(throughput: number, price: number) {
    const perSite = Math.ceil(liveSiteFPS / (throughput * util));
    return {
      workers: perSite * siteCount, perSite, effectiveFPS: perSite * throughput * util,
      cost: sharedCost + perSite * siteCount * price + 30 * eventGB * input.network + edgeRetention * input.storage,
    };
  }

  function cloud(throughput: number, price: number) {
    if (frames > 0 && usefulWindow === 0) return null;
    const workers = frames === 0 ? 0 : Math.ceil(frames / (throughput * usefulWindow * 3600 * util));
    const runtime = workers ? frames / (workers * throughput * util * 3600) : 0;
    const billed = workers ? Math.min(24, Math.max(input.billingFloor, runtime + input.warmup / 60)) : 0;
    return {
      workers, runtime, billed, busyPct: workers ? runtime * util / input.window * 100 : 0,
      cost: sharedCost + 30 * (workers * billed * price + rawGB * input.network) + cloudRetention * input.storage,
    };
  }

  return {
    siteCount, cameraCount, frames, rawGB, events, eventGB, edgeRetention, cloudRetention,
    liveSiteFPS, siteMbps, uploadHours, aggregateFPS, usefulWindow,
    aggregateUploadMbps: siteMbps * siteCount,
    sampleChance: Math.min(1, input.fps * input.transit),
    edgeCPU: edge(input.edgeCPU, input.edgePrice),
    edgeGPU: edge(input.edgeGPU, input.edgeGpuPrice),
    cloudCPU: cloud(input.cloudCPU, input.cpuPrice),
    cloudGPU: cloud(input.cloudGPU, input.gpuPrice),
  };
}

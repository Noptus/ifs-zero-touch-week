import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowUpRight, Video } from 'lucide-react';
import SiteFrame, { base } from './SiteFrame';
import { serverMode } from './pilot/client';
import '@fontsource-variable/inter';
import './styles.css';

type Reading = { text: string; model: string; digest: string; analyzedAt: string; observedAt: string | null; reused: boolean };
const setup = 'https://github.com/Noptus/ifs-zero-touch-week#run-the-live-demo';
const cameraPage = 'https://www.usgs.gov/volcanoes/kilauea/kwcam-live-panorama-halemaumau-west-rim-kilauea-summit-caldera-looking-southeast';
const feed = 'https://volcanoes.usgs.gov/observatories/hvo/cams/KWcam/images/M.jpg';
const interval = 5000;

function LiveFeed() {
  const [source, setSource] = useState('usgs');
  const [run, setRun] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Idle');
  const [preview, setPreview] = useState(feed);
  const [readings, setReadings] = useState<Reading[]>([]);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!serverMode) return;
    const ctl = new AbortController();
    fetch(`${base}api/vision`, { signal: ctl.signal }).then(response => response.ok ? response.json() : null)
      .then(data => { if (data && !ctl.signal.aborted) setEnabled(Boolean(data.enabled)); })
      .catch(() => undefined);
    return () => ctl.abort();
  }, []);

  useEffect(() => {
    if (!run) return;
    const ctl = new AbortController();
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    const canvas = document.createElement('canvas');
    async function tick() {
      if (ctl.signal.aborted) return;
      const start = performance.now();
      try {
        let frame: string | undefined;
        if (source === 'webcam') {
          const el = video.current;
          if (!el?.videoWidth) { timer = window.setTimeout(tick, 350); return; }
          const scale = Math.min(1, 640 / Math.max(el.videoWidth, el.videoHeight));
          canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
          canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
          canvas.getContext('2d')?.drawImage(el, 0, 0, canvas.width, canvas.height);
          frame = canvas.toDataURL('image/jpeg', 0.72);
        } else setPreview(`${base}api/camera?t=${Date.now()}`);
        setStatus('Analyzing frame…');
        const res = await fetch(`${base}api/vision`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source, frame }), signal: ctl.signal,
        });
        const result = await res.json();
        if (!res.ok) {
          if (res.status !== 429) throw new Error(result.error ?? 'Analysis failed.');
          setStatus('Model busy · retrying');
        } else {
          const next = result as Reading;
          if (ctl.signal.aborted) return;
          setReadings(list => list[0]?.digest === next.digest ? list : [next, ...list.filter(entry => entry.digest !== next.digest)].slice(0, 8));
          setStatus(next.reused ? 'Waiting for a new source frame' : 'Watching');
        }
        timer = window.setTimeout(tick, Math.max(500, interval - (performance.now() - start)));
      } catch (err) {
        if (ctl.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Analysis failed.');
        setStatus('Paused');
        setRun(false);
      }
    }
    async function begin() {
      if (source === 'webcam') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (ctl.signal.aborted) { stream.getTracks().forEach(track => track.stop()); return; }
          if (video.current) { video.current.srcObject = stream; await video.current.play(); }
        } catch {
          if (!ctl.signal.aborted) { setError('Camera permission is required, or no camera is available.'); setRun(false); setStatus('Paused'); }
          return;
        }
      }
      await tick();
    }
    void begin();
    return () => { ctl.abort(); window.clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()); };
  }, [run, source]);

  return <SiteFrame current="live">
    <section className="hero-band"><div className="shell hero"><div>
      <p className="hero-context">Zero-Touch Week · Evidence lab</p>
      <h1>Live feed analysis</h1>
      <p className="hero-description">Sample a live camera and see what a vision model can observe. Each reading carries a timestamp and the model name.</p>
    </div><aside className="pilot-target"><h2>Sampling target</h2><p className="target-value">5 <span>seconds</span></p><p>One frame at a time. The public feed refreshes on the operator’s schedule.</p></aside></div></section>
    <section className="shell section live-section">
      {!enabled && <p className="inline-note">Vision inference requires the pilot server with a configured model. <a className="text-button" href={setup}>Run locally with Ollama or LiteLLM <ArrowUpRight size={14} /></a></p>}
      <div className="live-grid">
        <div className="app-panel live-card">
          <div className="live-toolbar">
            <label htmlFor="live-camera">Camera</label><select id="live-camera" value={source} disabled={run} onChange={e => { setSource(e.target.value); setReadings([]); setError(''); setStatus('Idle'); setPreview(feed); }}>
              <option value="usgs">USGS Kīlauea webcam</option><option value="webcam">My webcam</option>
            </select>
            <button className="button primary small" disabled={!enabled} onClick={() => { setError(''); setStatus(run ? 'Stopped' : 'Starting…'); setRun(!run); }}><Video size={15} /> {run ? 'Stop' : 'Start analysis'}</button>
          </div>
          {source === 'usgs'
            ? <img className="live-preview" src={preview} alt="Latest still from the USGS Kīlauea webcam" />
            : <video className="live-preview" aria-label="My webcam preview" ref={video} autoPlay playsInline muted />}
          <p className="live-caption">{source === 'usgs' ? <a href={cameraPage} target="_blank" rel="noreferrer">Camera and imagery: U.S. Geological Survey <ArrowUpRight size={13} /></a> : 'Use a camera you control. Frames go to the configured vision provider while analysis is running.'}</p>
        </div>
        <div className="app-panel live-card">
          <h2><Activity size={17} /> Observations <span className="tag" role="status">{status}</span></h2>
          {error && <p className="inline-note" role="alert">{error}</p>}
          <ol className="live-observations" aria-label="Model observations">
            {readings.map(reading => <li key={reading.digest}>
              <small>{new Date(reading.analyzedAt).toLocaleTimeString()} · {reading.model}</small>
              <p>{reading.text}</p>
              <small>{reading.observedAt ? `Source timestamp: ${new Date(reading.observedAt).toLocaleString()}` : 'Source timestamp unavailable'}</small>
            </li>)}
          </ol>
          {!readings.length && <p>Start analysis to see the first observation.</p>}
          <p className="live-caption">Observations may be wrong and never affect a timesheet. The pilot does not save webcam frames; check your vision provider’s retention settings.</p>
        </div>
      </div>
    </section>
  </SiteFrame>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><LiveFeed /></StrictMode>);

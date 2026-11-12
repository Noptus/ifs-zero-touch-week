import { useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Fingerprint, ScanLine, ShieldCheck } from 'lucide-react';
import WorkerConfirmation from './WorkerConfirmation';
import { clock, duration, makeWeek, reportableMinutes, validate } from './workflow';
import type { Interval } from './workflow';

type Stage = 'journey' | 'worker' | 'manager';
type Status = 'Draft' | 'Pending review' | 'Changes requested' | 'Rejected' | 'Approved locally';
const stageNames = { journey: 'Worker journey', worker: 'Confirm timesheet', manager: 'Manager inbox' };
const initialWeek = makeWeek();
const mondayRows = initialWeek.filter(row => row.day === 0);

export default function WorkflowDemo() {
  const [stage, setStage] = useState<Stage>('journey');
  const stageNav = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [camera, setCamera] = useState(false);
  const [day, setDay] = useState(0);
  const [rows, setRows] = useState(initialWeek);
  const [status, setStatus] = useState<Status>('Draft');
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState('');
  const [attempt, setAttempt] = useState(false);
  const [inbox, setInbox] = useState<'ari' | 'mika'>('ari');
  const [otherStatus, setOtherStatus] = useState<Status>('Pending review');
  const [otherDecision, setOtherDecision] = useState('');
  const row = mondayRows[selected];
  const editable = status === 'Draft' || status === 'Changes requested' || status === 'Rejected';
  const errors = validate(rows);
  const weeklyMinutes = reportableMinutes(rows);
  const open = rows.filter(entry => !entry.confirmed).length;
  const overtime = weeklyMinutes > 2400;
  const flags = rows.filter(entry => entry.edited && entry.project !== initialWeek.find(original => original.id === entry.id)?.project);
  const activeStatus = inbox === 'ari' ? status : otherStatus;

  function goTo(next: Stage) {
    setStage(next);
    stageNav.current?.querySelector<HTMLButtonElement>(`[data-stage="${next}"]`)?.focus();
  }

  function update(id: string, patch: Partial<Interval>) {
    setRows(current => current.map(entry => entry.id === id ? { ...entry, ...patch, edited: true } : entry));
  }

  function submit() {
    setAttempt(true);
    if (errors.length) return;
    setStatus('Pending review');
    setChecked(false);
    setReason('');
    setDecision('');
    setInbox('ari');
    goTo('manager');
  }

  function resolve(next: Status) {
    if (activeStatus !== 'Pending review') return;
    if (next === 'Approved locally' && (inbox === 'mika' || ((overtime || flags.length > 0) && !checked))) return;
    if (next !== 'Approved locally' && !reason.trim()) return;
    if (inbox === 'mika') {
      setOtherStatus(next);
      setOtherDecision(reason.trim());
    } else {
      setStatus(next);
      setDecision(reason.trim());
    }
    setReason('');
    setChecked(false);
  }

  return <div className="app-panel">
    <nav ref={stageNav} className="stage-nav" aria-label="Demo steps">
      {(Object.keys(stageNames) as Stage[]).map(key => <button key={key} type="button" data-stage={key} aria-pressed={stage === key} onClick={() => setStage(key)}>{stageNames[key]}</button>)}
    </nav>
    {stage === 'journey' && <div className="demo-body">
      <div className="demo-toolbar">
        <div className="worker"><span className="avatar">AM</span><div><strong>Ari Morgan</strong><small>Field technician · Harbor Works</small></div></div>
        <button className="switch" type="button" role="switch" aria-checked={camera} onClick={() => setCamera(!camera)}><i /> Camera evidence <span>{camera ? 'on' : 'off'}</span></button>
      </div>
      <div className="journey-grid">
        <div className="timeline" aria-label="Monday evidence timeline">
          <div className="micro"><CalendarDays size={14} /> MONDAY, 9 NOVEMBER · SITE LOCAL</div>
          {mondayRows.map((entry, index) => <button key={entry.id} className="timeline-row" aria-pressed={selected === index} onClick={() => setSelected(index)}>
            <span className="mono">{clock(entry.start)}</span><span className={`activity-dot ${entry.activity.toLowerCase()}`} /><span><strong>{entry.activity === 'Gap' ? 'Unclassified gap' : entry.activity}</strong><small>{entry.evidence[0].label}</small></span><ChevronRight size={15} />
          </button>)}
        </div>
        <div className="evidence-card" aria-live="polite">
          <div className="micro"><Fingerprint size={14} /> INTERVAL PROVENANCE</div>
          <div className="interval-time">{clock(row.start)} <span>→</span> {clock(row.end)}</div>
          <div className="tag-line"><span className={`tag ${row.activity === 'Gap' ? 'warning' : 'green'}`}>{row.activity === 'Gap' ? 'Worker clarification' : row.evidence[0].quality}</span><span className="tag">{row.order}</span></div>
          <dl><dt>Proposed activity</dt><dd>{row.activity === 'Gap' ? 'Unclassified · 30 minutes' : row.activity}</dd><dt>Project</dt><dd>{row.project}</dd><dt>Start and end evidence</dt>
            {row.evidence.map(e => <dd className="evidence-source" key={e.id}><Clock3 size={14} /><div><strong>{e.label}</strong><small>{e.source}</small></div></dd>)}
          </dl>
          {camera && <div className="inline-note"><ScanLine size={16} /> {selected === 1 ? 'Gate A recorded an anonymous inbound crossing at 08:46. The dispatch log supports Ari’s interval.' : 'Camera evidence is optional. This interval uses operational records.'}</div>}
          <button type="button" className="text-button" onClick={() => { setDay(0); goTo('worker'); }}>Review the proposed week <ArrowRight size={15} /></button>
        </div>
      </div>
    </div>}
    {stage === 'worker' && <WorkerConfirmation
      rows={rows}
      day={day}
      status={status}
      editable={editable}
      managerNote={decision}
      errors={attempt ? errors : []}
      onSelectDay={setDay}
      onEdit={update}
      onSubmit={submit}
    />}
    {stage === 'manager' && <div className="demo-body manager-grid">
      <div className="inbox">
        <div className="micro"><ShieldCheck size={15} /> APPROVAL QUEUE</div>
        <button aria-pressed={inbox === 'ari'} onClick={() => { setInbox('ari'); setReason(''); setChecked(false); }}><span className="avatar">AM</span><span><strong>Ari Morgan</strong><small>{status}</small></span><ChevronRight size={15} /></button>
        <button aria-pressed={inbox === 'mika'} onClick={() => { setInbox('mika'); setReason(''); setChecked(false); }}><span className="avatar violet">MC</span><span><strong>Mika Chen</strong><small>{otherStatus} · 2 exceptions</small></span><ChevronRight size={15} /></button>
      </div>
      <div className="evidence-card manager-detail">
        <div className="micro">WEEK OF 9 NOVEMBER · FICTIONAL</div>
        <h3>{inbox === 'ari' ? 'Ari Morgan' : 'Mika Chen'} <span className="tag">{activeStatus}</span></h3>
        {inbox === 'ari' && <div className="review-totals">
          <span>{duration(weeklyMinutes)} excluding breaks and unresolved gaps</span>
          <button className="text-button" onClick={() => goTo('worker')}>See intervals <ArrowRight size={15} /></button>
        </div>}
        <div className="approval-flags">
          {inbox === 'mika' ? <><div className="inline-note"><CircleAlert size={16} /> Missing end-of-shift evidence on Thursday. Worker correction is required.</div><div className="inline-note"><CircleAlert size={16} /> Friday’s proposed allocation conflicts with the assignment roster.</div></> : <>
            {open > 0 && <div className="inline-note"><CircleAlert size={16} /> Monday’s gap needs worker confirmation.</div>}
            {overtime && <div className="inline-note"><CircleAlert size={16} /> {duration(weeklyMinutes)} exceeds this demo’s 40-hour review threshold. Check the applicable policy.</div>}
            {flags.length > 0 && <div className="inline-note"><CircleAlert size={16} /> {flags.length} project allocation {flags.length === 1 ? 'differs' : 'differ'} from the source work order. Verify reassignment.</div>}
            {!open && !overtime && !flags.length && <div className="inline-note positive"><Check size={16} /> No open exceptions in this draft.</div>}
          </>}
        </div>
        {activeStatus === 'Pending review' && <>
          {inbox === 'ari' && (overtime || flags.length > 0) && <label className="checkbox"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} /> I reviewed the flagged exceptions.</label>}
          <label className="reason">Manager note <small>Required to reject or request changes</small><textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} /></label>
          <div className="manager-actions">
            <button className="button primary small" disabled={inbox === 'mika' || ((overtime || flags.length > 0) && !checked)} onClick={() => resolve('Approved locally')}>Approve <Check size={15} /></button>
            <button className="button small" disabled={!reason.trim()} onClick={() => resolve('Changes requested')}>Request changes</button>
            <button className="button small danger" disabled={!reason.trim()} onClick={() => resolve('Rejected')}>Reject</button>
          </div>
        </>}
        {activeStatus !== 'Pending review' && <p className="status-line" role="status">{activeStatus === 'Approved locally' ? 'Approved in the demo. An ERP writeback would require a separate acknowledged transaction.' : (inbox === 'ari' ? decision : otherDecision) || 'Submit Ari’s draft from the worker view to open manager review.'}</p>}
        {inbox === 'ari' && editable && <button className="text-button" onClick={() => goTo('worker')}>Open worker view <ArrowRight size={15} /></button>}
      </div>
    </div>}
  </div>;
}

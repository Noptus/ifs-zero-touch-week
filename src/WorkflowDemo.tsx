import { useRef, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Fingerprint, ScanLine, ShieldCheck } from 'lucide-react';
import WorkerConfirmation from './WorkerConfirmation';
import { clock, duration, makeWeek, reportableMinutes, validate } from './workflow';
import type { Interval } from './workflow';
import { projects } from './workflow';
import { usePilot } from './pilot/client';
import { exampleWeek, projectOrder, timeExceptions } from './pilot/model';
import { base } from './SiteFrame';

type Stage = 'journey' | 'worker' | 'manager';
type Status = 'Draft' | 'Pending review' | 'Changes requested' | 'Rejected' | 'Approved locally';
const stageNames = { journey: 'Worker journey', worker: 'Confirm timesheet', manager: 'Manager inbox' };
const initialWeek = makeWeek();
const mondayRows = initialWeek.filter(row => row.day === 0);

const statuses = { submitted: 'Pending review', returned: 'Changes requested', rejected: 'Rejected', approved: 'Approved locally' } as const;
const today = new Date();
today.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
const currentMonday = today.toISOString().slice(0, 10);

export default function WorkflowDemo() {
  const pilot = usePilot();
  const [choice, setChoice] = useState<{ week: string; stage?: Stage }>({ week: '' });
  const week = choice.week || (pilot.actor.demo ? exampleWeek : currentMonday);
  return <Workflow key={week} pilot={pilot} week={week} initialStage={choice.stage} chooseWeek={(value, stage) => setChoice({ week: value, stage })} />;
}

function Workflow({ pilot, week, initialStage, chooseWeek }: { pilot: ReturnType<typeof usePilot>; week: string; initialStage?: Stage; chooseWeek: (value: string, stage?: Stage) => void }) {
  const demo = week === exampleWeek && pilot.actor.demo;
  const saved = pilot.workspace.timesheets[week];
  const [stage, setStage] = useState<Stage>(initialStage ?? (demo ? 'journey' : 'worker'));
  const stageNav = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  const [camera, setCamera] = useState(false);
  const [day, setDay] = useState(0);
  const [draft, setDraft] = useState<{ revision: number; rows: Interval[] }>();
  const rows = draft?.revision === (saved?.revision ?? 0) ? draft.rows : saved?.rows ?? (demo ? initialWeek : []);
  const status: Status = saved ? statuses[saved.state] : 'Draft';
  const [checked, setChecked] = useState(false);
  const [reason, setReason] = useState('');
  const [attempt, setAttempt] = useState(false);
  const [weekError, setWeekError] = useState('');
  const row = mondayRows[selected];
  const editable = !pilot.busy && pilot.actor.canSubmit && (status === 'Draft' || status === 'Changes requested' || status === 'Rejected');
  const errors = validate(rows);
  const weeklyMinutes = reportableMinutes(rows);
  const open = rows.filter(entry => !entry.confirmed).length;
  const { overtime, reassignments } = timeExceptions(rows, week, demo);

  function goTo(next: Stage) {
    setStage(next);
    stageNav.current?.querySelector<HTMLButtonElement>(`[data-stage="${next}"]`)?.focus();
  }

  function replace(next: Interval[]) {
    setDraft({ revision: saved?.revision ?? 0, rows: next });
  }

  function add() {
    const last = rows.filter(entry => entry.day === day).reduce((max, entry) => Math.max(max, entry.end), 480);
    const start = last <= 1379 ? last : 480;
    replace([...rows, { id: crypto.randomUUID(), day, start, end: start + 60, activity: 'Work', project: projects[0], order: projectOrder(projects[0]), confirmed: true, edited: true, evidence: [] }]);
  }

  function update(id: string, patch: Partial<Interval>) {
    replace(rows.map(entry => entry.id === id ? { ...entry, ...patch, edited: true } : entry));
  }

  async function submit() {
    setAttempt(true);
    if (errors.length || weeklyMinutes <= 0) return;
    const confirmed = rows.flatMap(entry => entry.confirmed && entry.activity !== 'Gap' ? [{ ...entry, activity: entry.activity, confirmed: true as const }] : []);
    if (confirmed.length !== rows.length) return;
    const next = await pilot.run({ type: 'time.submit', week, revision: saved?.revision ?? 0, rows: confirmed });
    if (next) { setChecked(false); setReason(''); if (pilot.actor.canReview) goTo('manager'); }
  }

  async function review(decision: 'approved' | 'returned' | 'rejected') {
    if (!saved) return;
    const next = await pilot.run({ type: 'time.review', week, revision: saved.revision, decision, note: reason, checked });
    if (next) { setReason(''); setChecked(false); }
  }

  function exportCsv() {
    if (saved?.state !== 'approved') return;
    const cell = (value: string | number) => '"' + String(value).replaceAll('"', '""') + '"';
    const output = [['Week', 'Day', 'Start', 'End', 'Activity', 'Project', 'Work order', 'Minutes', 'Revision'],
      ...saved.rows.filter(row => row.activity !== 'Break').map(row => [week, row.day + 1, clock(row.start), clock(row.end), row.activity, row.project, row.order, row.end - row.start, saved.revision])
    ].map(line => line.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([output], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `approved-timesheet-${week}-r${saved.revision}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="app-panel">
    <div className="demo-body week-toolbar">
      <label>Week starting (Monday) <input type="date" value={week} onChange={event => {
        const value = event.target.value;
        if (!value || new Date(value).getUTCDay() !== 1) { setWeekError('Select a Monday.'); return; }
        setWeekError(''); chooseWeek(value);
      }} /></label>
      <button className="text-button" disabled={pilot.busy} onClick={() => { void pilot.run(); }}>Refresh saved records</button>
      <a className="text-button" href={`${base}live/`}>Try live feed analysis <ArrowRight size={15} /></a>
    </div>
    {(weekError || pilot.error) && <p className="inline-note" role="alert">{weekError || pilot.error}</p>}
    <nav ref={stageNav} className="stage-nav" aria-label="Demo steps">
      {(Object.keys(stageNames) as Stage[]).filter(key => key !== 'journey' || demo).map(key => <button key={key} type="button" data-stage={key} aria-pressed={stage === key} onClick={() => setStage(key)}>{stageNames[key]}</button>)}
    </nav>
    {stage === 'journey' && demo && <div className="demo-body">
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
      week={week}
      managerNote={saved?.note ?? ''}
      errors={attempt ? (errors.length ? errors : weeklyMinutes <= 0 ? ['Add reportable time before submitting.'] : []) : []}
      onSelectDay={setDay}
      onEdit={update}
      onAdd={add}
      onRemove={id => replace(rows.filter(entry => entry.id !== id))}
      onSubmit={submit}
    />}
    {stage === 'manager' && <div className="demo-body manager-grid">
      <div className="inbox">
        <div className="micro"><ShieldCheck size={15} /> APPROVAL QUEUE</div>
        <div className="review-totals"><span className="avatar">AM</span><span><strong>{demo ? 'Ari Morgan' : 'Pilot employee'}</strong><br /><small>{status}</small></span></div>
        {Object.keys(pilot.workspace.timesheets).sort().reverse().map(value => <button key={value} aria-pressed={value === week} onClick={() => chooseWeek(value, 'manager')}><span>{value} · {statuses[pilot.workspace.timesheets[value].state]}</span><ChevronRight size={15} /></button>)}
      </div>
      <div className="evidence-card manager-detail">
        <div className="micro">WEEK OF {week}{demo ? ' · FICTIONAL' : ''}</div>
        <h3>Timesheet <span className="tag">{status}</span></h3>
        <div className="review-totals">
          <span>{duration(weeklyMinutes)} excluding breaks and unresolved gaps</span>
          <button className="text-button" onClick={() => goTo('worker')}>See intervals <ArrowRight size={15} /></button>
        </div>
        <div className="approval-flags">
          {open > 0 && <div className="inline-note"><CircleAlert size={16} /> Unclassified time needs worker confirmation.</div>}
          {overtime && <div className="inline-note"><CircleAlert size={16} /> {duration(weeklyMinutes)} exceeds the 40-hour review threshold. Check the applicable policy.</div>}
          {reassignments > 0 && <div className="inline-note"><CircleAlert size={16} /> {reassignments} project allocation changes. Verify reassignment.</div>}
          {!open && !overtime && !reassignments && <div className="inline-note positive"><Check size={16} /> No open exceptions.</div>}
        </div>
        {status === 'Pending review' && pilot.actor.canReview && <>
          {(overtime || reassignments > 0) && <label className="checkbox"><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} /> I reviewed the flagged exceptions.</label>}
          <label className="reason">Manager note <small>Required to reject or request changes</small><textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={500} rows={2} /></label>
          <div className="manager-actions">
            <button className="button primary small" disabled={pilot.busy || ((overtime || reassignments > 0) && !checked)} onClick={() => { void review('approved'); }}>Approve <Check size={15} /></button>
            <button className="button small" disabled={pilot.busy || !reason.trim()} onClick={() => { void review('returned'); }}>Request changes</button>
            <button className="button small danger" disabled={pilot.busy || !reason.trim()} onClick={() => { void review('rejected'); }}>Reject</button>
          </div>
        </>}
        {status !== 'Pending review' && <p className="status-line" role="status">{status === 'Approved locally' ? 'Approved in the demo. Download a CSV for handoff to payroll.' : saved?.note || 'Submit a worker timesheet to open manager review.'}</p>}
        {saved?.state === 'approved' && <button className="button small" onClick={exportCsv}>Download approved CSV</button>}
        {editable && <button className="text-button" onClick={() => goTo('worker')}>Open worker view <ArrowRight size={15} /></button>}
      </div>
    </div>}
  </div>;
}

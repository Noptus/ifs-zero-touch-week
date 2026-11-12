import { useState } from 'react';
import { ArrowRight, ChevronDown, CircleAlert } from 'lucide-react';
import { activities, clock, dates, days, duration, minutes, projects, reportableMinutes, sumMinutes } from './workflow';
import type { Activity, Interval, Project } from './workflow';

type Props = {
  rows: Interval[];
  day: number;
  status: string;
  editable: boolean;
  managerNote: string;
  errors: string[];
  onSelectDay: (day: number) => void;
  onEdit: (id: string, patch: Partial<Interval>) => void;
  onSubmit: () => void;
};

export default function WorkerConfirmation({
  rows, day, status, editable, managerNote, errors, onSelectDay, onEdit, onSubmit,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const dayRows = rows.filter(entry => entry.day === day);
  const unresolved = rows.filter(entry => !entry.confirmed).length;

  function close(id: string) {
    setExpanded(null);
    document.getElementById(`interval-toggle-${id}`)?.focus();
  }

  return <div className="worker-screen">
    <section className="worker-phone" aria-label="Worker timesheet">
      <header className="phone-header">
        <div className="worker"><span className="avatar" aria-hidden="true">AM</span><div><h3>Ari’s timesheet</h3><small>9–13 November 2026</small></div></div>
        <span className="tag">{status}</span>
      </header>

      <div className="phone-body">
        <div className="phone-week">
          <div><span>Week total</span><strong>{duration(reportableMinutes(rows))}</strong><small>Excludes breaks and unresolved intervals</small></div>
          {unresolved > 0 && <span className="tag warning"><CircleAlert size={13} /> {unresolved} to confirm</span>}
        </div>

        {managerNote && <p className="inline-note"><CircleAlert size={16} /> Manager note: {managerNote}</p>}

        <nav className="day-tabs" aria-label="Week days">{days.map((label, i) => <button key={label} type="button" aria-pressed={day === i} onClick={() => { onSelectDay(i); setExpanded(null); }}>{label}<small>{dates[i]}</small></button>)}</nav>

        <div className="phone-day"><h4>{days[day]} · {dates[day]}</h4><span>{duration(reportableMinutes(dayRows))} reportable</span></div>
        <ul className="phone-entries">
          {dayRows.map(entry => {
            const isOpen = expanded === entry.id;
            const toggleId = `interval-toggle-${entry.id}`;
            const editorId = `interval-editor-${entry.id}`;
            return <li key={entry.id} className={!entry.confirmed ? 'flagged' : undefined}>
              <button id={toggleId} type="button" className="phone-entry" aria-expanded={isOpen} aria-controls={editorId} onClick={() => setExpanded(isOpen ? null : entry.id)}>
                <span className={`activity-dot ${entry.activity.toLowerCase()}`} aria-hidden="true" />
                <span className="phone-entry-label">
                  <strong>{entry.activity === 'Gap' ? 'Unclassified gap' : entry.activity}</strong>
                  <small>{clock(entry.start) || '—'}–{clock(entry.end) || '—'} · {entry.project}</small>
                </span>
                {!entry.confirmed && <span className="tag warning">Review</span>}
                <ChevronDown className="phone-chevron" size={16} aria-hidden="true" />
              </button>
              <div id={editorId} hidden={!isOpen} className="phone-entry-detail">
                {isOpen && <>
                  {!entry.confirmed && <p>Choose the activity for this pause, then confirm it.</p>}
                  {editable ? <div className="phone-editor">
                    <label>Start<input aria-label={`Start for ${entry.id}`} type="time" value={clock(entry.start)} onChange={e => onEdit(entry.id, { start: minutes(e.target.value) })} /></label>
                    <label>End<input aria-label={`End for ${entry.id}`} type="time" value={clock(entry.end)} onChange={e => onEdit(entry.id, { end: minutes(e.target.value) })} /></label>
                    <label>Activity<select aria-label={`Activity for ${entry.id}`} value={entry.activity} onChange={e => onEdit(entry.id, { activity: e.target.value as Activity })}>{entry.activity === 'Gap' && <option value="Gap">Unclassified</option>}{activities.map(activity => <option key={activity}>{activity}</option>)}</select></label>
                    <label>Project<select aria-label={`Project for ${entry.id}`} value={entry.project} onChange={e => { const project = e.target.value as Project; onEdit(entry.id, { project, order: project === projects[0] ? 'WO-4821' : 'WO-4917' }); }}>{projects.map(project => <option key={project}>{project}</option>)}</select></label>
                  </div> : <p>{entry.order} · {entry.edited ? 'Corrected by worker' : 'Proposed from evidence'}</p>}
                  {editable && <div className="phone-editor-actions">
                    {entry.confirmed
                      ? <button type="button" className="button small" onClick={() => close(entry.id)}>Done</button>
                      : <button type="button" className="button small" disabled={entry.activity === 'Gap'} onClick={() => { onEdit(entry.id, { confirmed: true }); close(entry.id); }}>Confirm gap</button>}
                  </div>}
                </>}
              </div>
            </li>;
          })}
        </ul>

        <details className="phone-breakdown">
          <summary>Weekly breakdown <ChevronDown size={15} /></summary>
          <dl>
            {activities.map(activity => <div key={activity}><dt>{activity}</dt><dd>{duration(sumMinutes(rows.filter(entry => entry.activity === activity && entry.confirmed)))}</dd></div>)}
            {projects.map(project => <div key={project}><dt>{project}</dt><dd>{duration(reportableMinutes(rows.filter(entry => entry.project === project)))}</dd></div>)}
          </dl>
        </details>
      </div>

      <footer className="phone-footer">
        {editable ? <>
          {errors.length > 0 && <div className="inline-note" role="alert"><CircleAlert size={16} /> {errors.join(' ')}</div>}
          <button type="button" className="button primary" onClick={onSubmit}>Submit draft <ArrowRight size={16} /></button>
        </> : <small>This revision is locked while pending or approved.</small>}
      </footer>
    </section>
  </div>;
}

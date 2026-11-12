import { useState } from 'react';
import { ArrowDownToLine, ArrowRight, ChevronDown } from 'lucide-react';
import Architecture from './Architecture';
import CapacityPlanner from './CapacityPlanner';
import SiteFrame, { pdf } from './SiteFrame';
import WorkflowDemo from './WorkflowDemo';

const roadmap = [
  { title: 'Baseline', days: 'Days 01–07', detail: 'Choose one site, confirm the IFS test feed and measure current reporting effort.' },
  { title: 'Build', days: 'Days 08–14', detail: 'Replay operational events. Verify that late, missing or duplicate events stay visible in the draft.' },
  { title: 'Shadow', days: 'Days 15–21', detail: 'Compare pre-edit drafts against approved records. Track the share within 30 minutes and missing-record coverage.' },
  { title: 'Assisted pilot', days: 'Days 22–30', detail: 'Test IFS acknowledgment in a sandbox. Proposed targets are at least 90% of comparable worker-days within 30 minutes and zero observed harmful approvals.' },
];

export default function App() {
  const [week, setWeek] = useState(0);
  const phase = roadmap[week];

  return <SiteFrame current="timesheets">
    <section className="hero-band" aria-labelledby="title">
      <div className="shell hero">
        <div>
          <p className="hero-context">Zero-Touch Week · Independent IFS Cloud proposal</p>
          <h1 id="title">Timesheets</h1>
          <p className="hero-description">Draft timesheets from work orders and technician check-ins. Ask workers to correct gaps and managers to approve the result.</p>
          <div className="hero-actions">
            <a className="button primary" href="#workflow">Explore the demo <ArrowRight size={15} /></a>
            <a className="button" href={pdf} download><ArrowDownToLine size={15} /> Download architecture PDF</a>
          </div>
        </div>
        <aside className="pilot-target" aria-labelledby="time-tolerance">
          <h2 id="time-tolerance">Pilot accuracy target</h2>
          <p className="target-value">≤30 <span>minutes</span></p>
          <p>Absolute difference between the draft total before worker edits and the approved total for the same worker and day.</p>
          <p className="target-example">Example: 7h 50m draft vs. 8h 15m approved = 25 minutes of error.</p>
        </aside>
      </div>
    </section>
    <section className="shell section" id="workflow">
      <div className="section-title"><h2>Timesheet workflow</h2></div>
      <WorkflowDemo />
    </section>
    <section className="shell section" id="architecture">
      <div className="section-title"><h2>System architecture</h2></div>
      <Architecture />
    </section>
    <section className="shell section supporting-section" aria-label="Timesheet design details">
      <details className="supporting-panel" id="capacity">
        <summary>Capacity planner <ChevronDown size={16} /></summary>
        <CapacityPlanner />
      </details>
      <details className="supporting-panel" id="pilot">
        <summary>30-day pilot <ChevronDown size={16} /></summary>
        <div className="roadmap">
          <div className="roadmap-tabs" aria-label="Pilot weeks">{roadmap.map((item, i) => <button key={item.title} aria-pressed={i === week} onClick={() => setWeek(i)}><span className="micro">{item.days}</span><strong>{item.title}</strong><ArrowRight size={15} /></button>)}</div>
          <div className="roadmap-detail" aria-live="polite"><h3>{phase.title}</h3><p>{phase.detail}</p></div>
        </div>
      </details>
    </section>
  </SiteFrame>;
}

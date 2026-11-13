import { useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Architecture from './Architecture';
import CapacityPlanner from './CapacityPlanner';
import { ArchitectureDownload, CustomerValue, ProductFeatures, WorkflowLinks, WorkflowSection, productRequirements } from './CustomerCase';
import SiteFrame from './SiteFrame';
import WorkflowDemo from './WorkflowDemo';

const benefits = [
  { label: 'Technicians', text: 'Review time, travel and work orders already filled in from shift activity.' },
  { label: 'Supervisors', text: 'Start with gaps, overlaps and overtime that need a decision.' },
  { label: 'Payroll and billing', text: 'Trace approved labor to the right job and track when it posts.' },
];

const measures = [
  { value: '≥90%', label: 'Comparable worker-days within 30 minutes' },
  { value: '≥90%', label: 'Expected reporting days with a draft and approved reference' },
  { value: '≥30%', label: 'Less median active worker time per daily entry' },
];

const features = [
  { label: 'Shift drafts', text: 'Propose work, travel and waiting intervals from dispatch logs, work orders and check-ins.' },
  { label: 'Worker confirmation', text: 'Correct missing or overlapping time and confirm the week on a phone.' },
  { label: 'Manager review', text: 'Resolve exceptions, approve a specific revision and export hours for payroll.' },
];

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
    <div className="hero-band">
      <div className="shell hero">
        <div>
          <p className="hero-context">Zero-Touch Week · Independent IFS Cloud proposal</p>
          <h1 id="title">Timesheets</h1>
          <p className="hero-description">Draft each shift from work orders and check-ins so technicians spend less time entering hours and finance can post approved labor sooner.</p>
          <WorkflowLinks demo="workflow" architecture="architecture" />
        </div>
      </div>
    </div>
    <WorkflowSection id="workflow" title="Demo" description="Review a draft week, confirm it on a phone, and approve it in the manager inbox.">
      <WorkflowDemo />
    </WorkflowSection>
    <CustomerValue
      benefits={benefits}
      measures={measures}
      example="50 technicians saving 3 minutes a day across 20 workdays would free 50 staff hours per month."
    >
        <aside className="pilot-target" aria-labelledby="time-tolerance">
          <h3 id="time-tolerance">Pilot accuracy target</h3>
          <p className="target-value">≤30 <span>minutes</span></p>
          <p>Absolute difference between the draft total before worker edits and the approved total for the same worker and day.</p>
          <p className="target-example">Example: 7h 50m draft vs. 8h 15m approved = 25 minutes of error.</p>
        </aside>
    </CustomerValue>
    <WorkflowSection id="architecture" title="Architecture" description="Azure and IFS Cloud reference design.">
      <Architecture />
      <div className="section-followup">
        <ArchitectureDownload />
        <details className="supporting-panel" id="capacity">
          <summary>Capacity planner <ChevronDown size={16} /></summary>
          <CapacityPlanner />
        </details>
      </div>
    </WorkflowSection>
    <ProductFeatures features={features} requirements={productRequirements.timesheets}>
      <details className="supporting-panel section-followup" id="pilot">
        <summary>30-day pilot <ChevronDown size={16} /></summary>
        <div className="roadmap">
          <div className="roadmap-tabs" aria-label="Pilot weeks">{roadmap.map((item, i) => <button key={item.title} aria-pressed={i === week} onClick={() => setWeek(i)}><span className="micro">{item.days}</span><strong>{item.title}</strong><ArrowRight size={15} /></button>)}</div>
          <div className="roadmap-detail" aria-live="polite"><h3>{phase.title}</h3><p>{phase.detail}</p></div>
        </div>
      </details>
    </ProductFeatures>
  </SiteFrame>;
}

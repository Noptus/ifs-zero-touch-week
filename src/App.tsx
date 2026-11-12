import { useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, CameraOff, Check, ChevronDown, Cloud, Cpu, Database, FileText, GitBranch, LockKeyhole, Network, ShieldCheck, Users } from 'lucide-react';
import Architecture from './Architecture';
import CapacityPlanner from './CapacityPlanner';
import WorkflowDemo from './WorkflowDemo';

const pdf = `${import.meta.env.BASE_URL}docs/zero-touch-week-architecture.pdf`;
const repo = 'https://github.com/Noptus/ifs-zero-touch-week';

const decisions = [
  { title: 'Process video at the edge', icon: Network, choice: 'Send crossing metadata by default. Centralize only permitted evidence with a defined expiry.', trade: 'Gateway patching and offline recovery become fleet responsibilities.' },
  { title: 'Benchmark CPU first', icon: Cpu, choice: 'Compare decoded end-to-end fps on edge CPU, local GPU and queued cloud GPU.', trade: 'Accelerators can lower batch duration while adding idle, startup and operations costs.' },
  { title: 'Start with deterministic rules', icon: GitBranch, choice: 'Use an explainable state machine and versioned policies. Introduce ML for ranked suggestions after evaluation.', trade: 'Sparse or ambiguous evidence creates review work. Calibrated abstention limits silent error.' },
  { title: 'Separate events from commands', icon: Activity, choice: 'Accept and replay asynchronously at fleet scale. Apply synchronous validation at the review boundary.', trade: 'Ordering, duplicate delivery and an uncertain ERP result need explicit handling.' },
  { title: 'Split Go and Python by workload', icon: Users, choice: 'Go owns business transitions and writeback. Python owns vision, evaluation and optional inference.', trade: 'Version the boundary and trace requests across runtimes.' },
  { title: 'Keep evidence in Azure Blob', icon: Cloud, choice: 'Use private Blob containers and lifecycle policies for approved evidence objects.', trade: 'Regional copies and deletion propagation need tests. S3 compatibility is an optional integration.' },
  { title: 'Layer site and tenant configuration', icon: Database, choice: 'Tenants own activity and retention policy. Sites configure zone geometry, cameras and link budgets within policy.', trade: 'Policy precedence, rollout versioning and auditable overrides need clear ownership.' },
  { title: 'Make the camera optional', icon: CameraOff, choice: 'Start with IFS status and authorized check-ins. Evaluate anonymous crossings as corroboration after approval.', trade: 'A camera adds maintenance and privacy burden. Require evidence of incremental value before rollout.' },
];

const roadmap = [
  { title: 'Discover & baseline', days: 'Days 01–07', detail: 'Map current approvals, source latency and corrections. Discover the deployed IFS projection and profile representative edge hardware.', test: 'Measure manual reporting time and data completeness. If cameras are proposed, test field of view only after authorization.', gate: 'Agree which worker-days are eligible for comparison, confirm the camera-free baseline and complete privacy sign-off.' },
  { title: 'Build & replay', days: 'Days 08–14', detail: 'Ship the camera-free prototype and reconstruct drafts from synthetic and authorized test events. If approved, deploy a limited entrance/exit gateway in a test environment.', test: 'Replay duplicates, late/offline events, timezone changes, missing breaks and outage recovery. Measure decode-inclusive throughput.', gate: 'Stable replays and visible gaps. No worker identification from camera observations.' },
  { title: 'Run in shadow mode', days: 'Days 15–21', detail: 'Compare suggested entries with approved records. Let workers correct and managers review. Keep production writeback disabled.', test: 'Measure the share of comparable worker-days within 30 minutes of the approved total, plus median and p90 error. Report missing drafts or approved records as coverage gaps.', gate: 'Review failure slices and resolve severe payroll or privacy risks before assisted use.' },
  { title: 'Review assisted use', days: 'Days 22–30', detail: 'Run a controlled assisted workflow. Validate approval and reconciliation against an approved test environment, and compare camera-free and camera-assisted results where allowed.', test: 'Measure worker and manager time, harmful approvals and estimated cost per site/day.', gate: 'Go only against signed hypotheses. Proposed targets are at least 90% of comparable worker-days within 30 minutes and zero observed harmful approvals. Review results by shift and evidence coverage.' },
];

const controls = [
  { title: 'Purpose and worker rights', icon: CameraOff, text: 'Keep cameras disabled by default. Assess whether reuse of security footage is compatible with its original purpose. Document necessity, applicable lawful basis, DPIA where required, worker notice and applicable consultation. Employment consent may be difficult to rely on.' },
  { title: 'Identity and tenant boundaries', icon: LockKeyhole, text: 'Bind device identity to tenant/site at ingress. Scope app roles and authorization to assignments. Keep badge/check-in identities separate from anonymous camera events. Use tenant-keyed rows, scoped storage and cross-tenant denial tests.' },
  { title: 'Retention and accountability', icon: ShieldCheck, text: 'Prefer metadata. Encrypt transport and storage, rotate credentials, and expire approved evidence objects. Log policy version, provenance, corrections, approval and ERP acknowledgment. Give workers a way to contest a draft.' },
];

function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="section-title"><h2>{title}</h2>{children && <p>{children}</p>}</div>;
}

export default function App() {
  const [week, setWeek] = useState(0);
  const [menu, setMenu] = useState(false);
  const phase = roadmap[week];

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a href="#" className="brand" aria-label="Zero-Touch Week home">Zero-Touch Week</a>
        <button className="button small mobile-menu" aria-expanded={menu} aria-controls="site-nav" onClick={() => setMenu(!menu)}>Sections <ChevronDown size={15} /></button>
        <nav id="site-nav" className={menu ? 'site-nav open' : 'site-nav'} aria-label="Main navigation">
          <a href="#workflow" onClick={() => setMenu(false)}>Workflow</a><a href="#architecture" onClick={() => setMenu(false)}>Architecture</a><a href="#capacity" onClick={() => setMenu(false)}>Capacity</a><a href="#pilot" onClick={() => setMenu(false)}>Pilot</a>
        </nav>
        <a className="button small header-doc" href={pdf} target="_blank" rel="noreferrer"><FileText size={15} /> Architecture PDF <ArrowUpRight size={14} /></a>
      </div>
    </header>
    <main id="main">
      <section className="hero-band" aria-labelledby="title">
        <div className="shell hero">
          <div>
            <p className="hero-context">Independent architecture proposal for IFS Cloud</p>
            <h1 id="title">Zero-Touch Week</h1>
            <p className="hero-description">Draft field-service timesheets from work-order events and technician check-ins. Workers correct entries and managers approve them.</p>
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
        <SectionTitle title="Timesheet workflow">Review a fictional shift, correct the draft and submit it for approval.</SectionTitle>
        <WorkflowDemo />
      </section>
      <section className="shell section" id="architecture">
        <SectionTitle title="System architecture">Switch between the one-site pilot and fleet designs. Select a component for responsibilities and failure handling.</SectionTitle>
        <Architecture />
      </section>
      <section className="shell section" id="capacity">
        <SectionTitle title="Capacity planner">Compare edge and cloud processing using editable assumptions.</SectionTitle>
        <CapacityPlanner />
      </section>
      <section className="shell section" id="decisions">
        <SectionTitle title="Engineering decisions" />
        <div className="decision-grid">{decisions.map(({ title, icon: Icon, choice, trade }) => <details key={title} className="decision"><summary><Icon size={19} /> {title} <ChevronDown size={16} /></summary><div><p>{choice}</p><p><strong>Trade-off.</strong> {trade}</p></div></details>)}</div>
      </section>
      <section className="shell section" id="pilot">
        <SectionTitle title="30-day pilot">Start with one site and a camera-free baseline. Measure draft accuracy and correction effort before assisted use.</SectionTitle>
        <div className="roadmap">
          <div className="roadmap-tabs" aria-label="Pilot weeks">{roadmap.map((item, i) => <button key={item.title} aria-pressed={i === week} onClick={() => setWeek(i)}><span className="micro">{item.days}</span><strong>{item.title}</strong><ArrowRight size={15} /></button>)}</div>
          <div className="roadmap-detail" aria-live="polite"><h3>{phase.title}</h3><p>{phase.detail}</p><p><strong>Validate.</strong> {phase.test}</p><div className="inline-note positive"><Check size={18} /> {phase.gate}</div></div>
        </div>
      </section>
      <section className="shell section" id="responsible-ai">
        <SectionTitle title="Security and worker privacy" />
        <div className="control-grid">{controls.map(({ title, icon: Icon, text }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="shell section" id="brief">
        <div className="brief-banner">
          <div><h2>Architecture brief</h2><p>Event contracts, infrastructure sizing, model evaluation and the pilot plan.</p>
            <div className="hero-actions"><a className="button primary" href={pdf} download><ArrowDownToLine size={17} /> Download PDF</a><a className="button" href={pdf} target="_blank" rel="noreferrer">View PDF <ArrowUpRight size={16} /></a></div>
          </div>
          <a className="brief-preview" href={pdf} target="_blank" rel="noreferrer" aria-label="Open the architecture brief PDF">
            <img src={`${import.meta.env.BASE_URL}docs/brief-preview.png`} width="440" height="622" loading="lazy" alt="Cover of the Zero-Touch Week architecture brief" />
          </a>
        </div>
      </section>
    </main>
    <footer className="site-footer"><div className="shell"><span><Activity size={18} /> Zero-Touch Week · Independent proposal</span><a href={repo} target="_blank" rel="noreferrer">Source on GitHub <ArrowUpRight size={15} /></a><a href="#main">Back to top <ArrowDown className="flip" size={14} /></a></div></footer>
  </>;
}

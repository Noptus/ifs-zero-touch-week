import { useState } from 'react';
import type { ReactNode } from 'react';
import { Activity, ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, CameraOff, Check, ChevronDown, Cloud, Cpu, Database, FileText, GitBranch, LockKeyhole, Network, ShieldCheck, Users } from 'lucide-react';
import Architecture from './Architecture';
import CapacityPlanner from './CapacityPlanner';
import HeroVisual from './HeroVisual';
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
  { title: 'Discover & baseline', days: 'Days 01–07', detail: 'Map current approvals, source latency and corrections. Confirm whether ±30 minutes applies to boundaries, daily totals or both. Discover the deployed IFS projection and profile representative edge hardware.', test: 'Measure manual reporting time and data completeness. If cameras are proposed, test field of view only after authorization.', gate: 'Agree ground truth, pilot thresholds, camera-free baseline and privacy sign-off.' },
  { title: 'Build & replay', days: 'Days 08–14', detail: 'Ship the camera-free prototype and reconstruct drafts from synthetic and authorized test events. If approved, deploy a limited entrance/exit gateway in a test environment.', test: 'Replay duplicates, late/offline events, timezone changes, missing breaks and outage recovery. Measure decode-inclusive throughput.', gate: 'Stable replays and visible gaps. No worker identification from camera observations.' },
  { title: 'Run in shadow mode', days: 'Days 15–21', detail: 'Compare suggested entries with approved records. Let workers correct and managers review. Keep production writeback disabled.', test: 'Measure median/p90 daily error, ±30 min coverage, category and allocation accuracy, correction rates, missing signals and false crossings.', gate: 'Review failure slices and resolve severe payroll or privacy risks before assisted use.' },
  { title: 'Review assisted use', days: 'Days 22–30', detail: 'Run a controlled assisted workflow. Validate approval and reconciliation against an approved test environment, and compare camera-free and camera-assisted results where allowed.', test: 'Measure worker and manager time, harmful approvals and estimated cost per site/day.', gate: 'Go only against signed hypotheses. Example targets are ≥90% of daily totals within tolerance and zero observed harmful approvals, subject to sample size and slice review.' },
];

const controls = [
  { title: 'Purpose and worker rights', icon: CameraOff, text: 'Keep cameras disabled by default. Assess whether reuse of security footage is compatible with its original purpose. Document necessity, applicable lawful basis, DPIA where required, worker notice and applicable consultation. Employment consent may be difficult to rely on.' },
  { title: 'Identity and tenant boundaries', icon: LockKeyhole, text: 'Bind device identity to tenant/site at ingress. Scope app roles and authorization to assignments. Keep badge/check-in identities separate from anonymous camera events. Use tenant-keyed rows, scoped storage and cross-tenant denial tests.' },
  { title: 'Retention and accountability', icon: ShieldCheck, text: 'Prefer metadata. Encrypt transport and storage, rotate credentials, and expire approved evidence objects. Log policy version, provenance, corrections, approval and ERP acknowledgment. Give workers a way to contest a draft.' },
];

function SectionTitle({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return <div className="section-title"><p className="eyebrow">{label}</p><h2>{title}</h2><p>{children}</p></div>;
}

export default function App() {
  const [week, setWeek] = useState(0);
  const [menu, setMenu] = useState(false);
  const phase = roadmap[week];

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a href="#" className="brand" aria-label="Zero-Touch Week home"><span className="brand-mark"><Activity size={22} /></span><span>Zero-Touch <b>Week</b></span></a>
        <button className="button small mobile-menu" aria-expanded={menu} aria-controls="site-nav" onClick={() => setMenu(!menu)}>Sections <ChevronDown size={15} /></button>
        <nav id="site-nav" className={menu ? 'site-nav open' : 'site-nav'} aria-label="Main navigation">
          <a href="#workflow" onClick={() => setMenu(false)}>Workflow</a><a href="#architecture" onClick={() => setMenu(false)}>Architecture</a><a href="#capacity" onClick={() => setMenu(false)}>Capacity</a><a href="#pilot" onClick={() => setMenu(false)}>Pilot</a>
        </nav>
        <a className="button small header-doc" href={pdf} target="_blank" rel="noreferrer"><FileText size={15} /> Architecture PDF <ArrowUpRight size={14} /></a>
      </div>
    </header>
    <main id="main">
      <section className="shell hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> IFS CLOUD ARCHITECTURE SHOWCASE</div>
          <h1>Zero-Touch<br /><em>Week<span>.</span></em></h1>
          <p className="hero-line">Your work already happened.<br />Your timesheet should know.</p>
          <p className="hero-description">From operational signals to accurate timesheets — without the paperwork. A proposal for field teams, with worker confirmation and manager approval built in.</p>
          <div className="hero-actions"><a className="button primary" href="#workflow">Explore the demo <ArrowRight size={18} /></a><a className="button" href={pdf} download><ArrowDownToLine size={17} /> Download architecture PDF</a></div>
        </div>
        <HeroVisual />
      </section>
      <div className="shell"><div className="principles">
        <div><span className="micro">TIME PRECISION</span><strong>~30 minutes</strong><small>Tolerance scope to confirm</small></div>
        <div><span className="micro">ACTIVITY MODEL</span><strong>4 categories</strong><small>Travel, work, waiting, break</small></div>
        <div><span className="micro">HUMAN CONTROL</span><strong>Worker → Manager</strong><small>Corrections and approval before posting</small></div>
      </div></div>
      <section className="shell section" id="workflow">
        <SectionTitle label="01 / WORKFLOW" title="Follow the evidence.">Walk through a fictional technician’s day, resolve the unclear interval and approve the resulting timesheet.</SectionTitle>
        <WorkflowDemo />
      </section>
      <section className="shell section" id="architecture">
        <SectionTitle label="02 / ARCHITECTURE" title="From the site to IFS Cloud.">Explore the one-site pilot and the fleet design. Select a component to see what it owns and how it recovers.</SectionTitle>
        <Architecture />
      </section>
      <section className="shell section" id="capacity">
        <SectionTitle label="03 / CAPACITY PLANNING" title="Size the system from first principles.">Change site count, sampling rate, throughput and prices to compare edge processing with cloud batches.</SectionTitle>
        <CapacityPlanner />
      </section>
      <section className="shell section" id="decisions">
        <SectionTitle label="04 / ENGINEERING DECISIONS" title="What the design optimizes for.">Open a decision to see the proposed approach and its operational trade-off.</SectionTitle>
        <div className="decision-grid">{decisions.map(({ title, icon: Icon, choice, trade }) => <details key={title} className="decision"><summary><Icon size={19} /> {title} <ChevronDown size={16} /></summary><div><p>{choice}</p><p><strong>Trade-off.</strong> {trade}</p></div></details>)}</div>
      </section>
      <section className="shell section" id="pilot">
        <SectionTitle label="05 / ONE-SITE PILOT" title="Thirty days to a go/no-go decision.">Start with a camera-free baseline. Compare proposed drafts to approved records before enabling assisted use.</SectionTitle>
        <div className="roadmap">
          <div className="roadmap-tabs" aria-label="Pilot weeks">{roadmap.map((item, i) => <button key={item.title} aria-pressed={i === week} onClick={() => setWeek(i)}><span className="micro">{item.days}</span><strong>{item.title}</strong><ArrowRight size={15} /></button>)}</div>
          <div className="roadmap-detail" aria-live="polite"><h3>{phase.title}</h3><p>{phase.detail}</p><p><strong>Validate.</strong> {phase.test}</p><div className="inline-note positive"><Check size={18} /> {phase.gate}</div></div>
        </div>
      </section>
      <section className="shell section" id="responsible-ai">
        <SectionTitle label="06 / RESPONSIBLE AI & SECURITY" title="Automate data capture, not accountability.">Keep uncertainty visible. Workers correct evidence-backed suggestions, and authorized managers approve specific revisions.</SectionTitle>
        <div className="control-grid">{controls.map(({ title, icon: Icon, text }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>
      <section className="shell section" id="brief">
        <div className="brief-banner">
          <div><p className="eyebrow"><FileText size={17} /> TECHNICAL ARCHITECTURE BRIEF</p><h2>Take the design into review.</h2><p>Ten pages covering event contracts, sizing, AI evaluation, privacy gates and the first 30 days.</p>
            <div className="hero-actions"><a className="button primary" href={pdf} download><ArrowDownToLine size={17} /> Download PDF</a><a className="button" href={pdf} target="_blank" rel="noreferrer">View PDF <ArrowUpRight size={16} /></a></div>
          </div>
          <a className="brief-preview" href={pdf} target="_blank" rel="noreferrer" aria-label="Open the architecture brief PDF">
            <img src={`${import.meta.env.BASE_URL}docs/brief-preview.png`} width="440" height="622" loading="lazy" alt="Cover of the Zero-Touch Week architecture brief" />
          </a>
        </div>
      </section>
    </main>
    <footer className="site-footer"><div className="shell"><span><Activity size={18} /> Zero-Touch Week · Independent architecture showcase</span><a href={repo} target="_blank" rel="noreferrer">Source on GitHub <ArrowUpRight size={15} /></a><a href="#main">Back to top <ArrowDown className="flip" size={14} /></a></div></footer>
  </>;
}

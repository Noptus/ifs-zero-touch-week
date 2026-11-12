import { useState } from 'react';
import { ArrowDown, ArrowRight, Box, Camera, Database, Factory, GitBranch, Layers3, Monitor, Network, Radio, Server, ShieldCheck } from 'lucide-react';

const nodes = {
  signals: { name: 'Site & work orders', tech: 'RTSP · IFS events', icon: Camera, purpose: 'Collect authorized check-ins and work-order transitions. Optional entrance/exit cameras emit anonymous crossing candidates.', failure: 'A camera outage removes corroboration. Delayed work-order events raise a freshness flag and can reopen an unapproved draft.' },
  edge: { name: 'Edge gateway', tech: 'Python · SQLite', icon: Box, purpose: 'Sample entrance zones, detect and track short-lived objects, and spool event metadata locally before authenticated delivery.', failure: 'An offline gateway retries stable event IDs. Track spool age and disk usage, and raise a visible gap when buffering is exhausted.' },
  ingest: { name: 'Secure ingestion', tech: 'Nexus gateway · Go', icon: Radio, purpose: 'Bind device identity to tenant and site, validate versioned contracts, enforce replay and rate limits, and acknowledge durable acceptance.', failure: 'Invalid events are quarantined. Expired credentials and overload trigger backoff without discarding acknowledged evidence.' },
  kafka: { name: 'Event backbone', tech: 'Kafka · keyed streams', icon: Network, purpose: 'Separate observation, operational and approval streams. Order within tenant/site or tenant/worker keys and retain a bounded replay window.', failure: 'Consumer lag raises alerts. Transactional inbox/outbox and idempotent consumers contain duplicates and isolate poison records.' },
  core: { name: 'Reconstruct', tech: 'Go · state machine', icon: GitBranch, purpose: 'Normalize event time and reconcile authorized signals into bounded intervals with provenance. Keep open and conflicting intervals unresolved.', failure: 'Late evidence triggers bounded recomputation. Approved revisions require a governed correction instead of silent mutation.' },
  policy: { name: 'Validate policy', tech: 'Go · versioned rules', icon: ShieldCheck, purpose: 'Flag overlaps, missing evidence, allocation conflicts, missing breaks and overtime. Keep the policy version with the draft.', failure: 'Unknown or stale policy sends the item to review. Rules never insert fictional breaks or infer payable time from presence alone.' },
  ml: { name: 'Optional inference', tech: 'Python · batch jobs', icon: Layers3, purpose: 'Suggest an activity or allocation only after beating the rules baseline. If separately permitted, run queued visual inference on AKS CPU or GPU.', failure: 'Low confidence, drift or unavailable inference falls back to rules and abstention. Failed jobs retry within limits and then quarantine.' },
  state: { name: 'Owned state', tech: 'PostgreSQL · Blob', icon: Database, purpose: 'Store draft revisions, event inbox/outbox and audit metadata in PostgreSQL. Use Blob only for permitted, expiring evidence objects.', failure: 'Use tenant-scoped keys and restore tests. Preserve a visible unavailable-evidence state when an object expires or is inaccessible.' },
  review: { name: 'Human review', tech: 'React · worker/manager', icon: Monitor, purpose: 'Workers resolve ambiguity and correct allocations. Managers review exceptions and authorize a specific revision.', failure: 'Offline edits queue against a known revision. Concurrency conflicts require explicit re-review before approval.' },
  erp: { name: 'IFS Cloud', tech: 'F1 · OData projections', icon: Factory, purpose: 'Use an approved projection and scoped integration principal. IFS remains authoritative for posted time, expense, finance and payroll.', failure: 'If a response is lost, reconcile the external reference before retrying. Kafka publication never marks a draft as posted.' },
} as const;
type NodeId = keyof typeof nodes;
const pilot: NodeId[][] = [['signals', 'ingest'], ['core', 'policy'], ['review', 'state'], ['erp']];
const fleet: NodeId[][] = [['signals', 'edge'], ['ingest', 'kafka'], ['core', 'policy', 'ml'], ['review', 'erp', 'state']];
const supportingNodes: Partial<Record<NodeId, string>> = { edge: 'OPTIONAL VISION INPUT', ml: 'OPTIONAL SUGGESTIONS', state: 'SUPPORTING STATE' };
const columns = ['Collect', 'Accept', 'Decide', 'Review & post'];

export default function Architecture() {
  const [mode, setMode] = useState<'pilot' | 'fleet'>('fleet');
  const [active, setActive] = useState<NodeId>('edge');
  const layout = mode === 'fleet' ? fleet : pilot;
  const node = nodes[active];
  const NodeIcon = node.icon;
  return <div className="architecture-panel">
    <div className="architecture-head">
      <div className="micro"><Server size={15} /> {mode === 'fleet' ? 'AZURE · KAIROS / NEXUS' : 'ONE SITE · SHADOW MODE'}</div>
      <div className="segments" aria-label="Architecture scale">
        <button aria-pressed={mode === 'pilot'} onClick={() => { setMode('pilot'); setActive('core'); }}>One-site pilot</button>
        <button aria-pressed={mode === 'fleet'} onClick={() => { setMode('fleet'); setActive('edge'); }}>Fleet scale</button>
      </div>
    </div>
    <p className="architecture-caption">{mode === 'fleet' ? 'Kafka decouples replayable processing from ingestion. Use AKS when workload, isolation or operating requirements justify it.' : 'Start with authorized check-ins, an IFS test feed and a single Go service with a PostgreSQL outbox. Run review in shadow mode and validate the ERP boundary in a test environment.'}</p>
    <div className="arch-grid" aria-label={`${mode} architecture, read left to right`}>
      {layout.map((lane, i) => <div className="arch-lane" key={columns[i]}>
        <h3>{(mode === 'pilot' ? ['Collect & accept', 'Decide', 'Store & review', 'ERP boundary'] : columns)[i]}{i !== layout.length - 1 && <ArrowRight size={15} />}</h3>
        {lane.map((id, j) => {
          const item = nodes[id];
          const Icon = item.icon;
          return <div className="node-wrap" key={id}>
            {j > 0 && <span className={supportingNodes[id] ? "node-link supporting" : "node-link"}>{supportingNodes[id] ?? <ArrowDown size={12} />}</span>}
            <button className="node" aria-pressed={active === id} onClick={() => setActive(id)}><Icon size={20} /><span><strong>{item.name}</strong><small>{item.tech}</small></span></button>
          </div>;
        })}
      </div>)}
    </div>
    <div className="architecture-detail" aria-live="polite">
      <div><NodeIcon size={22} /><h3>{node.name}</h3></div>
      <div><span className="micro">RESPONSIBILITY</span><p>{node.purpose}</p></div>
      <div><span className="micro">FAILURE RESPONSE</span><p>{node.failure}</p></div>
    </div>
  </div>;
}

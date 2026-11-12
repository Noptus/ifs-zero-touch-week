# Field timesheet product requirements

**Status** · Proposed for customer discovery and engineering estimation

**Pilot** · One field-service team, one reporting policy, one source of work events, one sandbox destination

**Decision owners** · Customer field-operations lead, payroll or billing policy owner, and product owner

## Customer outcome

Technicians often reconstruct work and travel after a shift. Supervisors spend time chasing missing entries, and finance waits for labor to be allocated to the right job. The product should create an evidence-backed draft while the shift is still recent, give workers a short correction path, and let supervisors start with exceptions. Finance should be able to trace each posted entry back to the approved revision and its work order.

| User | Job to be done | Pilot measure |
| --- | --- | --- |
| Technician | Review and confirm a shift from a phone before the reporting deadline. | Active reporting minutes per worker-day and share submitted on time. |
| Supervisor | Resolve gaps, overlaps and policy exceptions with context. | Active review minutes per timesheet and share requiring follow-up. |
| Payroll or billing operator | Receive approved labor against the right job and reconcile posting. | Work-order allocation accuracy and approved-to-acknowledged delay. |

## Scope and decisions

**Pilot required.** Mobile draft review, authorized work events and check-ins, manual fallback, supervisor approval, and sandbox export or writeback. The pilot uses work, travel, waiting and break as example categories. The customer's code mappings, compensable time and rounding rules govern reporting.

**Later options.** Offline editing with synchronization, additional source adapters, configurable approval delegation, and separately authorized anonymous camera context. Each option needs a measurable customer benefit. Optional cameras contribute site observations only. Identification requires a separately authorized source.

Before implementation, agree which events describe the start and end of work, who approves which crews, the site-local reporting day and cut-off, break and overtime rules, and whether corrections to posted entries are adjustments or reversals.

## Functional requirements

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| TIME-01 | Ingest versioned work-order, scheduling and worker check-in observations. Preserve source identity, event ID, event and ingestion times, and any work-order reference. Deduplicate per tenant and source. | Sending the same event three times yields one observation. A conflicting payload under the same ID is flagged. A delayed event retains its original event time. |
| TIME-02 | Produce a draft for each eligible worker-day using accepted evidence and a versioned policy. Every interval exposes its sources and category or its reason for being unresolved. | Work-order evidence and check-ins produce proposed work and travel. A missing end or conflicting assignment stays open for review. An unobserved interval contributes zero reportable minutes until resolved. |
| TIME-03 | Validate chronological order, overlaps, reporting-day boundaries, code mappings and policy exceptions. Surface disputed breaks or overtime for review. | Overlapping intervals cannot be submitted. An overnight shift is attributed under the tenant's calendar and timezone rules. A possible missed break creates a flag without deducting time. |
| TIME-04 | Let an authorized worker review the evidence, correct their own draft, and confirm a complete revision from a phone. Offer an accessible manual entry path when the draft or source is unavailable. | A worker can resolve a flagged gap, see the recalculated total, and confirm once. An attempt to open another worker's draft is denied. Manual entries retain their origin. |
| TIME-05 | Let a scoped supervisor approve, reject or request changes to the submitted revision. Require a reason for rejection or return. | A returned revision becomes editable and shows the reason. Approving an outdated revision after a concurrent change is rejected. Repeated approval requests create one decision. |
| TIME-06 | Preserve the approved snapshot. Apply late or corrected evidence to open drafts under a replay policy. Route material changes to approved entries through a new linked revision. | A late check-in can refresh an open draft and shows what changed. The earlier approved snapshot remains auditable and requires a new authorized decision for an adjustment. |
| TIME-07 | Send only approved revisions to the configured destination and expose separate approved, pending posting, acknowledged and reconciliation states. | If posting succeeds and the response is lost, look up the existing destination record or hold for reconciliation. Repeating the operation cannot silently create a second time entry. |
| TIME-08 | Provide a searchable audit trail and actionable failure reasons for authorized support. | An operator can trace an acknowledged entry to observations, policy version, worker correction, supervisor decision and destination reference. Raw personal evidence stays outside application logs. |

## Data and integration contract

| Record | Required fields and invariants |
| --- | --- |
| Observation | Tenant, source system and event ID, schema version, occurrence and ingestion timestamps, evidence type, and permitted worker, site or work-order references. Anonymous observations carry no worker identity. |
| Draft | Tenant, employee, reporting date and timezone, revision, policy version and status. Each interval carries start and end instants, code, allocation, source references and correction history. Store reportable time in whole minutes under the approved policy. |
| Decision | Draft ID and revision, actor, scope, decision, reason where required, and timestamp. A concurrent edit invalidates approval of an older revision. |
| Posting record | Tenant and stable destination key, approved revision, attempt status, destination reference and reconciliation result. Persist approval and the durable posting request together or provide an equivalent atomic guarantee. |

Input and output adapters map external records to the canonical contract. Product rules consume those records independently of the transport, storage engine, evidence model or ERP. A single deployable application with durable state and a retryable background worker is sufficient for the pilot. Introduce distributed components when throughput or isolation requires them. Validate the destination's replay and lookup semantics before enabling writes.

## Operational acceptance

- **Failure and recovery.** Pause intake or posting independently. Show source freshness, preserve unresolved work and keep manual reporting available during an outage. Resume from a saved checkpoint without duplicate side effects.
- **Security and privacy.** Enforce tenant, employee and supervisor scope on reads, edits, exports and replay. Define retention for observations, drafts and audits. Validate tenant isolation and deletion using synthetic fixtures before handling customer records.
- **Access and usability.** Test at 320 CSS pixels, by keyboard and with assistive technology. Error messages identify the affected interval and remain visible on retry. Confirm submission status after a reconnect.
- **Capacity and observability.** Agree peak worker count and source rate from customer data. Report draft age, ingestion lag, unresolved rate, posting backlog and acknowledgment latency by site without exposing worker IDs in metric labels.

## Pilot scorecard

Capture a baseline in the customer's current workflow before enabling assisted entry. Compare the same team, shift mix and rules. Lock the reference labels before evaluating the pre-edit draft.

| Measure | Definition | Proposed gate for discovery |
| --- | --- | --- |
| Comparable coverage | Worker-days with both a pre-edit draft and an approved reference ÷ expected reporting days. Define expected days before sampling and publish missing reasons. | At least 90% coverage. |
| Daily time accuracy | Comparable worker-days where the absolute difference between pre-edit and approved reportable minutes is ≤30 ÷ comparable worker-days. Report boundary and allocation error separately. | At least 90% within 30 minutes. |
| Worker effort | Median active minutes to create or confirm a daily entry. Include correction time and report the 90th percentile. | At least 30% lower than the baseline. |
| Supervisor and finance effort | Median active review minutes, follow-up rate, allocation error and time to acknowledged posting. | No material deterioration against the agreed baseline. |
| Posting integrity | Duplicate, unauthorized or incorrectly applied entries in fault tests and the observed pilot. | Zero in acceptance tests. Any observed harmful posting blocks expansion until resolved. |

Treat the numerical gates as hypotheses. Agree the evaluation window, sample size and reporting cohorts before running the pilot. Report absolute counts and missing data alongside percentages. At an illustrative 50 workers × 20 days × 3 minutes saved, the worker-only benefit would be 50 hours per month.

## Delivery and sign-off

Build a vertical slice from one accepted observation through a mobile draft and supervisor decision first (TIME-01 through TIME-05). Add late-evidence replay, durable posting and audit recovery before assisted use (TIME-06 through TIME-08).

1. **Discover and baseline.** The field lead supplies redacted event and approved-timesheet samples. The policy owner signs the code, calendar, overtime and approval mappings. The integration owner confirms sandbox access and posting capability.
2. **Replay and shadow.** Engineering runs the requirements and fault cases against fixtures, then compares drafts with approved records while staff use the existing process.
3. **Assist and reconcile.** The team uses drafts with a manual fallback. Exercise authorized sandbox posting, acknowledgment loss, replay and rollback. Customer operations and payroll or billing sign the scorecard, support ownership and production gate.

[Timesheet demo](https://noptus.github.io/ifs-zero-touch-week/#workflow) · [Reference architecture](../technical/architecture.md) · [Pilot engineering plan](../technical/pilot-plan.md)

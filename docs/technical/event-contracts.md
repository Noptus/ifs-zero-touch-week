# Event contracts

This proposed envelope is internal to the reference design. Confirm the actual IFS contract in the target environment.

```json
{
  "schemaVersion": 1,
  "eventId": "evt-cross-0101",
  "tenantId": "demo-tenant",
  "siteId": "harbor-site",
  "source": "edge.entrance",
  "type": "presence.crossing.observed",
  "occurredAt": "2026-11-09T07:46:02Z",
  "processedAt": "2026-11-09T07:46:05Z",
  "workOrderId": null,
  "correlationId": "trace-demo-0123",
  "data": {
    "zone": "gate-a",
    "direction": "in",
    "quality": "two-sided-track"
  }
}
```

`occurredAt` is producer event time. `processedAt` is the first processing time at the producing boundary. Ingress records its own durable receive time and device offset estimate. Validate schema versions and reject unknown tenant/site bindings. Optional order references are allowed for operational events when known. Generic camera events carry no employee identifier, badge token or persistent track token.

An independently authorized check-in event can carry a tenant-scoped pseudonymous worker reference in a restricted stream. Only the authorized identity resolver may map a badge to an employee. Use an approved time/site match to add contextual corroboration. Crowded or ambiguous crossings stay anonymous, and a crossing alone never creates individual attendance.

## Processing guarantees

| Stream | Partition key | Consumer behavior |
| --- | --- | --- |
| Presence observations | Tenant/site | Deduplicate candidate observations, record source outages and forward context only. |
| Authorized worker signals | Tenant/worker | Normalize event time, retain provenance, and recompute affected unapproved revisions. |
| Draft lifecycle / approval | Tenant/draft | Enforce revision checks and atomically queue writeback. |
| Acknowledgment | Tenant/draft | Compare external reference to the posted revision and reconcile any mismatch. |

Deduplicate by tenant, source and event ID, with a payload hash to detect conflicting reuse. Commit inbox, state and outbox in one database transaction, then commit Kafka offset. Version the schema compatibly and replay against pinned rules. Quarantine unprocessable events using a bounded, access-controlled dead-letter workflow. Alert on stale gaps and provide audited replay. Kafka replay and at-least-once delivery require idempotence at application and ERP boundaries. [Apache Kafka design](https://kafka.apache.org/44/design/design/).

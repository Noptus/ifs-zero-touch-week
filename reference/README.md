# Illustrative implementation boundaries

These Python-like and Go-like snippets document interfaces and failure handling. They require adapter implementations, hardware validation, security review and supported IFS contracts before deployment. They contain no camera credentials, video samples, model weights or IFS endpoints.

## Python edge gateway

```python
def collect_crossings(config, decoder, detector, tracker, outbox):
    # Decoder owns a bounded frame queue, reconnects with backoff, and reports gaps.
    # Resolve the approved RTSP source from local secret storage.
    for frame, capture_utc in decoder.frames(config.source_ref):
        if not config.sampler.accept(frame.monotonic_timestamp):
            continue
        entrance = config.mask_to_approved_zone(frame)
        people = detector.detect(entrance, classes=["person"])
        tracks = tracker.update(people, capture_utc, max_age_seconds=config.track_ttl)
        for track in tracks:
            # Use signed distance from the line, hysteresis and observations on
            # both sides. Expire and debounce within this local track only.
            crossing = config.crossing_line.update(track, capture_utc)
            if crossing is not None:
                event = new_anonymous_crossing(config.site, capture_utc, crossing)
                # INSERT with the generated event ID in a durable SQLite transaction.
                # Fail visibly on quota exhaustion. This is never an identity event.
                outbox.insert(event)

def flush(outbox, authenticated_ingress):
    for event in outbox.due_batch():
        try:
            acknowledgment = authenticated_ingress.send(event)
        except TransientTransportError:
            outbox.reschedule_with_backoff(event.id)
            continue
        if acknowledgment.durably_accepted_id == event.id:
            outbox.delete(event.id)
        elif acknowledgment.is_permanent_rejection:
            outbox.quarantine(event.id, acknowledgment.code)
        else:
            outbox.reschedule_with_backoff(event.id)
```

Use an FFmpeg or GStreamer decoder on an isolated network with configurable decode timeout. Use SQLite WAL and synchronous durability settings appropriate to the hardware, a bounded spool, stable identifiers and supervised restarts. Test power loss, expired credentials, replay, duplicate suppression and full storage.

## Kafka and Go application services

```go
for message := range partitionMessages {
    err := store.InTransaction(ctx, func(tx Tx) error {
        // Validate authorized tenant/site and schema first. Commit malformed
        // records to a restricted quarantine with a reason and replay policy.
        result := tx.AcceptInbox(message.Tenant, message.Source, message.ID, message.Hash)
        switch result {
        case ConflictingPayload:
            return tx.Quarantine(message, "event ID reused with different payload")
        case AlreadyProcessed:
            return nil
        default:
            // Apply business state and append any output to the outbox in this transaction.
            return tx.ApplyEvidence(message)
        }
    })
    if err != nil {
        // Retain the offset and stop this partition to preserve retry order.
        return err
    }
    if err := offsets.CommitNext(ctx, message); err != nil {
        return err // Replaying is safe because the inbox committed.
    }
}
```

### Reconstruct a draft

```text
load versioned operational events by tenant, worker and affected shift
normalize UTC, event ordering, source offset and site timezone
compare with schedules, leave and existing time before proposing intervals
for each transition in event-time order:
  if late within replay window, recompute the affected draft revision
  if transition conflicts or end evidence is missing, expose unresolved state
  otherwise close the prior interval with source IDs and open the next one
keep candidate work orders and reject overlapping payable minutes
apply tenant policy and store evidence, warnings and policy version
if previously approved, use the governed correction workflow
```

The browser implementation in [src/workflow.ts](../src/workflow.ts) runs a small deterministic example. Production would also need correction versions, DST, overnight shifts, multiple simultaneous orders and offline sync.

### Optional Python inference contract

```python
class AllocationRanker(Protocol):
    def suggest(self, features_as_of_draft, eligible_work_orders) -> RankedSuggestion | None:
        """Return candidate, score, feature/model version and evidence IDs, or abstain."""
        ...

def evaluate_for_review(ranker, draft_features, eligible_orders, threshold):
    result = ranker.suggest(draft_features, eligible_orders)
    if result is None or result.calibrated_score < threshold:
        return unresolved_suggestion()
    return draft_hint(result)  # Separate from deterministic policy and approval.
```

### IFS writeback adapter

```text
on approval:
  authorize tenant, worker assignment, manager and revision
  atomically persist approved revision and writeback outbox key

on dispatch:
  lease the command and check whether it already has an authoritative receipt
  after any ambiguous attempt, query supported external reference first
  if the result cannot be resolved reliably, route to reconciliation
  call the verified tenant-specific projection with supported fields
  persist authoritative IFS identifier and acknowledgment
  only then advance to posted
  retry transient, definitively unapplied failures within bounds
  quarantine permanent failures and alert the integration owner
```

Projection names, payloads, authentication, unique reference behavior and status lookup depend on the installed IFS release and tenant configuration.

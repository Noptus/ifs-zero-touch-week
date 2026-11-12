# Production roadmap

1. **Qualify the baseline.** Deploy the pilot with IFS test feeds, explicit check-ins and shadow drafts. Validate provenance and rule semantics before testing posting. Agree ownership and an escalation path for incomplete evidence.
2. **Enable governed writeback.** Confirm a supported IFS projection, external reference, authorization and reconciliation behavior. Simulate lost response, duplicate messages, stale approvals and region outage. Roll out under a kill switch to a limited cohort with operator review.
3. **Scale by regional cohort.** Validate residency and tenancy, partition skew, replay time, backlog recovery, regional restore and multi-zone availability. Measure unit cost and alert on drift. Add Kafka capacity, dedicated workers or AKS node pools from observed loads.
4. **Evaluate optional enhancements.** Test edge cameras only with purpose and notice controls. Compare to camera-free baseline on matched shifts. Add ML after forward and tenant-held-out validation. Consider receipts and expense workflow through separate IFS contracts and explicit worker attestations.
5. **Operate and audit.** Define SLOs from measured evidence and posting delays. Rehearse credential revocation, backup restore, model rollback, deletion, camera disablement and writeback pause. Capture production outcomes before expanding the cohort.

Open questions include tolerance scope, regional residence, tenant overrides, approved use of site-access records, authoritative timestamps, the supported writeback contract and the economic case for cameras.

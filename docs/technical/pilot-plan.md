# One-site pilot

| Days | Activities | Gate |
| --- | --- | --- |
| 1–7 | Meet site and worker representatives, measure manual baseline, inventory authorized signals, discover IFS contracts. Profile representative hardware. | Confirm cohort, policy, authorized feeds and data handling. Require separate camera approval and field-of-view validation if proposed. |
| 8–14 | Implement camera-free baseline, generate synthetic replay signals and test correlation. If authorized, evaluate an entrance/exit prototype. | Duplicate, out-of-order, late/offline, clock, shift-boundary and missing-event tests pass. Profile decode and inference. |
| 15–21 | Shadow drafts against approved records. Pilot worker corrections and exception-driven manager review. | Review error by shift and evidence availability. Keep production payroll disconnected. |
| 22–30 | Controlled assisted workflow. Exercise adapter, permission and lost-response recovery against a designated test environment. | Sign a go/no-go decision after review of privacy controls, error, harmful approvals, cost and staff time. |

## Scorecard

- **Time accuracy.** For each comparable worker-day, subtract approved reportable minutes from the draft total captured before worker edits and take the absolute value. A result of 30 minutes or less meets the target (7h 50m draft versus 8h 15m approved gives 25 minutes of error). Apply the same tenant rules and site-local reporting day to both totals. Report the share within target, median and p90 error, interval-boundary error, and the count of worker-days with missing drafts or approved references.
- **Classification.** Precision and recall for each category, plus the fraction of attributable intervals that match approved project/work-order labels.
- **Human effort.** Corrections per draft and minutes per worker and reviewer, compared with the manual baseline. Review severe errors and false approvals.
- **Signals.** Missing event rate by source. For approved camera tests, measure false and missed entry/exit separately against labels across lighting and traffic slices.
- **Operations.** Acknowledgment latency, retry/reconciliation outcomes and estimated USD per site/day. Check edge spool age and disconnect recovery.
- **Governance.** Complete worker notice, consultation, lawful purpose, privacy assessment, retention and access tests wherever applicable.

A potential pilot hypothesis is ≥90% of comparable worker-days within 30 minutes, measurable effort reduction and zero observed harmful approvals. Agree the sample size, target and confidence bounds before shadow mode. A small sample with zero failures does not establish production safety.

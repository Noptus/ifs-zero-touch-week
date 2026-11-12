# Work expense product requirements

**Status** · Proposed for customer discovery and engineering estimation

**Pilot** · One employee group, EUR purchases, one finance policy, one sandbox destination

**Decision owners** · Customer expense policy owner, finance operations lead, and product owner

## Customer outcome

Field staff buy work supplies wherever they can get them. The product should turn a receipt photo into an itemized draft, apply the employee's allowance, and reserve the payable amount after a clean confirmation. Approvers see evidence and reasons for exceptions. Finance can see committed spend before posting and reconcile eligible lines to the expense system.

| User | Job to be done | Pilot measure |
| --- | --- | --- |
| Employee | Photograph a receipt and confirm the eligible items from a phone. | Active minutes per claim and share completed with one confirmation. |
| Expense approver | Resolve missing evidence, ambiguous items, price outliers and allowance conflicts. | Review minutes, exception share and false referrals. |
| Finance operator | Reconcile reservations and posted claims against policy and the destination record. | Outstanding reservation age, posting delay and reconciliation discrepancies. |

## Scope and policy

**Pilot required.** Accept a photo or digital image from any merchant. Extract and review EUR receipt fields, decide eligibility per line, compare available price references, and enforce a **€500 allowance per employee per calendar month**. The purchase date selects the period under the tenant's accounting calendar. Use gross eligible item amounts in euro cents. The allowance, allowed categories, price references and authority to post are versioned tenant policy.

**Later options.** Multi-currency conversion, approved exceptions to the cap, automated corporate-card matching, and optional receipt provenance or forensic models. Pilot items without reliable evidence or a comparable price take the review path. A typical price or readable receipt alone does not authorize payment.

The policy owner must confirm who can review claims, which work categories and project codes are in scope, the source and refresh interval for comparable prices, treatment of VAT and discounts, and how refunds or past-period corrections restore a reservation or adjust posted spend.

## Functional requirements

| ID | Requirement | Acceptance check |
| --- | --- | --- |
| EXP-01 | Accept camera capture and image attachment on a phone. Preserve original evidence with scoped access, a stable capture key and visible retry state. | A receipt from an unknown merchant enters the same flow. An interrupted upload can resume or retry without creating a second claim. Unreadable files offer retake or manual entry. |
| EXP-02 | Extract merchant, purchase date, currency, receipt total, and line descriptions, quantities and amounts with source references. Show and accept corrections. | A €92.30 receipt is itemized into an €89.90 cordless drill and a €2.40 chocolate bar. Low-confidence fields remain editable and enter review where they affect payment. |
| EXP-03 | Evaluate line eligibility, tax and discount treatment, and work allocation using versioned tenant rules. Maintain an explicit disposition and reason per line. | A work-related drill is proposed and personal chocolate is excluded. Only eligible cents enter the claim. Unknown purpose and unreconciled totals go to review. |
| EXP-04 | Compare gross unit prices against a versioned comparable range using item specification, quantity, date, currency, market and tax basis. Allow the check to abstain. | An €89.90 drill falls within the example €40–€140 range. A €199.90 drill or an unmatched specification goes to review with the reason and reference shown. |
| EXP-05 | Treat exact receipt replays as idempotent. Surface likely duplicates, inconsistent data and evidence of synthesis or manipulation as review signals. Show uncertain origin separately. | Retrying the same upload reuses the claim. Different receipts with similar headers can be adjudicated. An explicit AI-source marker triggers review. An unmarked image remains unverified. |
| EXP-06 | Show available balance and reserve eligible cents once after authorization. Apply the cap transactionally against posted plus reserved cents for the same employee and month. | With €320 used or reserved, the drill reserves €89.90 and leaves €90.10. Two parallel €100 claims against €180 available cannot both reserve. An over-cap claim enters review without a reservation. |
| EXP-07 | Support one employee confirmation on a clean draft and a reasoned reviewer decision on exceptions. Apply tenant approval policy before any posting. | A clear claim can reach ready status with one confirmation. Material corrections, unresolved FX and ambiguous evidence route to review. A reviewer can return, accept eligible lines within the cap, or reject with a reason. |
| EXP-08 | Post only authorized eligible lines and track the authoritative result. Finalize the reservation only on acknowledgment and release it on withdrawal or definitive failure under policy. | A lost response holds the reservation while the adapter checks for the existing posting. Retrying cannot pay twice. A reviewer can trace the result to the employee confirmation, policy and line decisions. |

## Data and integration contract

| Record | Required fields and invariants |
| --- | --- |
| Evidence | Tenant and employee scope, receipt ID, capture key, content digest, private object reference, capture time and retention status. Separate source-confidence and provenance indicators. |
| Claim revision | Merchant, purchase date and accounting timezone, original currency, integer line and receipt amounts, item dispositions, policy and reference versions, correction history and attestation. Keep original and corrected values distinct. |
| Allowance period | Tenant, employee, purchase month, currency, cap, reserved cents and acknowledged cents. Maintain a durable transaction history with claim/revision references. |
| Posting | Authorized claim revision, eligible lines only, stable destination key, external reference, response state and reconciliation record. A hold retains the reservation until the result is resolved. |

The receipt extractor returns structured fields and evidence spans. It can be replaced without changing policy or ledger logic. Reference-price data comes through a configurable feed, catalog or curated tenant table. Identity, storage, OCR and ERP are adapters. Use a durable worker for extraction and posting, transactional ledger updates, and a scoped reviewer queue. A single service with a durable job mechanism is sufficient until load or operational isolation justifies separation.

## Operational acceptance

- **Evidence safety.** Enforce attachment type, size and decoded-dimension limits. Scan attachments before server processing. Limit access to the owner, scoped reviewers and authorized finance operators. Redact unnecessary payment identifiers and keep images and OCR text out of logs.
- **Provenance.** Use signed source evidence or verified merchant/payment records where available. Calibrate any forensic signal against legitimate scans, photos, vendors and locales. Surface explanations and a correction path. A missing or unverified signal alone cannot deny reimbursement.
- **Failure and recovery.** Preserve the receipt when extraction is unavailable. Let the employee retry or enter fields manually. Alert on stranded reservations, failed exports and pending reconciliation. Exercise retry, duplicate upload and parallel approval races.
- **Access and audit.** Test mobile capture, keyboard-only editing and screen-reader labels. Run tenant-isolation and deletion checks. Retain approved amounts and decisions under customer audit policy after permitted evidence expiry.

## Pilot scorecard

Compare against the current expense workflow using a representative, redacted receipt set. Include mixed baskets, missing fields, price outliers and legitimate receipts with uncertain origin. Lock the finance-reviewed expected line dispositions before evaluating the drafts.

| Measure | Definition | Proposed gate for discovery |
| --- | --- | --- |
| Employee effort | Median active minutes from capture through submission, including corrections. Report the 90th percentile. | At least 30% lower than baseline. |
| One-confirmation share | Claims with exactly one worker confirmation, no field edits and no extra evidence request ÷ all in-scope submitted claims. | At least 70%, subject to confirmed policy and sample size. |
| Eligible amount accuracy | In-scope claims whose proposed eligible euro cents match the independent finance-reviewed amount ÷ in-scope claims with an approved reference. Report missing-reference coverage and false approvals separately. | Agree the threshold before shadow mode. |
| Exception load | Legitimate claims routed to avoidable review ÷ legitimate claims with a reviewed outcome. Report review minutes and reason mix. | No material increase in review effort against the baseline. |
| Ledger and posting integrity | Over-cap, duplicate, personal-item and unauthorized postings in fault tests and the observed pilot. | Zero in acceptance tests. Any observed harmful posting blocks expansion until resolved. |

Treat the numerical gates as hypotheses and report the sample size, reason codes and error counts. At an illustrative 200 claims × 4 active minutes saved, the employee-only benefit would be about 13 hours per month.

## Delivery and sign-off

Build the receipt-to-draft slice with a fixed reference catalog first (EXP-01 through EXP-04). Add duplicate review, the transactional allowance and approval workflow before enabling the sandbox adapter (EXP-05 through EXP-08).

1. **Discover and baseline.** Finance supplies redacted receipts, historical dispositions, allowance rules and reference prices. The integration owner confirms a sandbox expense interface and acknowledgment semantics.
2. **Shadow and review.** Compare extraction, policy decisions and allowance calculations against finance-reviewed outcomes. Exercise test cases for unknown merchants, mixed baskets, low-confidence evidence, duplicate photos and concurrent reservations.
3. **Assist and reconcile.** Enable employee confirmation and scoped review. Post test claims to the sandbox and reconcile them. Finance and the product owner sign the scorecard, fallback procedure and conditions for any production rollout.

[Expense demo](https://noptus.github.io/ifs-zero-touch-week/expenses/#receipt) · [Expense reference architecture](../technical/expense-processing.md)

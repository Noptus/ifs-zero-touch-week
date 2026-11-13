# Expense processing

## Pilot policy

Each employee has a **$500 USD calendar-month reimbursement limit** for eligible work purchases. The purchase date, interpreted in the tenant's reporting timezone, selects the allowance period. The pilot uses gross USD item amounts and accepts receipts from any merchant. Merchant identity helps verify a transaction. It does not determine eligibility.

For the fictional Harbor Hardware receipt, the $99.00 cordless drill is eligible and the $1.99 chocolate bar is personal. The employee submits $99.00 out of the $100.99 receipt. With $320 previously used or reserved, the available balance moves from $180 to $81.00. The $70–$140 gross unit reference for a cordless drill is illustrative. Production ranges require comparable products, specification, currency, tax basis, geography, date, and an owned source such as contracted prices or procurement history.

| Check | Rule and resolution |
| --- | --- |
| Item extraction | Extract merchant, transaction date, currency, item description, quantity, line gross amount, tax and total when available. Keep source spans and confidence. Detect the distinction between unit and line price. |
| Work eligibility | Match a tenant-versioned category policy and optional work-order context. The employee attests to work use when confirming. Exclude obvious personal items. Ask about ambiguous categories or missing context. |
| Price | Compare like-for-like gross unit prices in USD. Route outliers and missing benchmarks to review. A price outlier does not establish fraud. |
| Receipt consistency | Reconcile line totals, taxes, discounts and gross total. Retain line-level amounts in minor units. When tax or discounts are present but cannot be allocated reliably, request review. Confirm FX for non-USD receipts before deciding the allowance. |
| Provenance | Verify signed merchant records or signed provenance when available. Check exact file and likely transaction duplicates, mismatches, and any reliable payment or merchant evidence. Preserve the underlying signals and explanations. |
| Allowance | Compute available amount as $500 USD minus posted and reserved eligible gross cents. A claim above the available amount goes to review. The pilot never automatically pays a partial claim. |

## Zero-touch path and exceptions

1. Capture a photo or attach a digital receipt. Create a tenant- and employee-scoped receipt ID and persist its evidence reference. A kiosk, phone or employee portal uses the same workflow.
2. Extract structured data and normalize fields. Apply rules and propose only eligible items. Preserve the original receipt and the original extraction for audit, while restricting access to personal lines.
3. On a clean draft, the employee confirms work use in one action. Submit the claim to a writeback outbox with a reservation if the tenant's authorization policy permits straight-through processing. The pilot exercises this path in a sandbox. Where additional approval is required, keep it as a policy gate.
4. Route low confidence, price outliers, meaningful corrections, likely duplicates, allowance conflicts, unrecognized currency or provenance signals to exception review. Reviewers can request evidence, accept eligible lines within the cap or reject with an explanation. Never auto-reject a claim solely on a detector score or missing provenance.
5. The adapter posts only approved or policy-authorized eligible lines using a supported IFS Cloud expense projection. Save the authoritative IFS identifier and reconcile acknowledgments. The photo is evidence. The IFS transaction is authoritative.

### AI-generated receipt signals

The browser demonstration checks for an explicit AI-source metadata marker in supported PNG or JPEG metadata. The flagged image is a fictional fixture with a deliberately inserted marker. These metadata fields are unverified and can be absent or altered. A photograph of paper generally does not preserve digital provenance. An OCR confidence score measures extraction quality. In production, verify signature and trust chain for any C2PA assertions before treating them as provenance evidence, and evaluate independently corroborated merchant, payment or transaction data. A weak or missing signal leaves origin unknown. An optional Python image-forensics worker can provide a review score for suspected synthesis or tampering after evaluation on held-out merchants, photo and scan conditions, and supported locales. Measure false referrals, calibration and performance on rephotographed examples before rollout.

## Azure implementation

- **Capture and isolation.** React mobile UI calls a tenant-scoped Go API through the approved identity gateway. Bind the employee from Entra ID claims and server-side assignments. Accept bounded image sizes and decoded dimensions, validate file contents and scan attachments before processing. Write evidence via the API to private regional Azure Blob Storage with managed identity. Use scoped short-lived access for authorized reviewers.
- **Extraction.** Start with one Go deployment and a PostgreSQL outbox. A worker reads a private Blob, calls Azure Document Intelligence's prebuilt receipt model, polls asynchronously, and stores versioned fields and source spans. Persist the provider operation ID for retries. Use backoff, bounded retries and a review queue for timeouts or unreadable receipts. Exercise extraction and language coverage before expanding.
- **Policy.** Persist a typed claim and its line-level policy decisions, benchmark version, provenance signal sources, employee attestation and reviewer decisions. Exclude personal amounts from the exported IFS write request. Optional catalog matching ranks candidates and can abstain. The Go policy remains responsible for authorization and amounts.
- **Concurrency.** Scope unique claim/event keys by tenant. A transaction locks the employee-month ledger row, rechecks currency, eligibility and capacity, reserves approved cents, and creates the outbox command. Release reservations after terminal rejection or withdrawal. Convert reserved cents to posted cents on acknowledgment without double-counting. Persist any release or correction as a new auditable transition.
- **Fleet.** Reuse Kairos/Nexus Kafka for evidence-ready and claim lifecycle events. Deploy independent Go workers on AKS when throughput warrants it. Keep evidence payloads outside events. Track OCR latency and failure, retries, reviewer backlog, duplicate rate and reservation age with OpenTelemetry and Azure Monitor.
- **Evidence.** Agree regional storage, retention and tax/audit obligations. Redact unnecessary payment identifiers and exclude raw images and extracted text from telemetry. Expire private evidence and run deletion tests. Azure Document Intelligence temporarily stores input and analysis results. Confirm residency and use its deletion API where required.

### State and writeback contract

```text
captured → extracting → draft → employee confirmed
  → ready + reserved → posting → acknowledged → reconciled
  → needs review → reviewer decision → ready + reserved / rejected
```

Use a stable tenant/claim/revision key for writeback. Discover supported IFS projection, receipt attachment rules, employee/project codes and acknowledgment behavior in the target release. After ambiguous transport failure, look up the external reference first. If a reliable lookup is unavailable, quarantine for reconciliation. Never resend a possibly applied expense based solely on a timeout.

## Acceptance cases

- Mixed basket. Extract the drill and chocolate, reserve $99.00 once, and exclude $1.99.
- Uncertain source. Show explicit metadata as a review signal and keep unmarked photos neutral.
- Price and allowance. Send a $218.00 drill for review when above the comparable range and $180 remaining. A review draft makes no reservation.
- Cross-month and concurrent submissions. Apply the purchase month and transactionally reject or route oversubscription. Replays cannot reserve twice.
- Readability and correction. Test ordinary photos in multiple layouts, currencies and locales. Measure item-level extraction, correction time, straight-through share, false referrals and duplicate leakage. Start in shadow mode before enabling tenant-authorized writeback.

## Demonstrator boundary

The public site runs English/French OCR in the browser and saves claims, original photos, and decisions in IndexedDB on submission. The [Azure pilot template](../../infra/main.bicep) runs one Node.js service with Entra roles and private PostgreSQL. A reviewer verifies employee-supplied data before reserving funds in the private pilot. JPEG, PNG and WebP up to 12 MB are accepted; the explicit metadata check supports PNG and JPEG. FX conversion, cryptographic provenance, Document Intelligence, live price data, payment, and IFS writeback are future integrations. For the illustrative price reference and source links, see the [demo runbook](../../README.md#run-the-local-pilot).

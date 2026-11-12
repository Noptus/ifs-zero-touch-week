# Zero-Touch Week

**From operational signals to accurate timesheets — without the paperwork.**

An independent architecture showcase for an IFS technical interview. Explore two field-service workflows: evidence-backed timesheets and receipt-to-claim expenses.

- [Timesheets](https://noptus.github.io/ifs-zero-touch-week/)
- [Expenses](https://noptus.github.io/ifs-zero-touch-week/expenses/)
- [Architecture brief (PDF)](https://noptus.github.io/ifs-zero-touch-week/docs/zero-touch-week-architecture.pdf)
- [GitHub Pages workflow](.github/workflows/pages.yml)

## Run locally

Requires Node.js 22.12+ and npm. The committed PDF and cover preview are ready to serve.

```sh
npm ci
npm run dev
```

Open the printed URL with the `/ifs-zero-touch-week/` base path. To generate the PDF and test the production build:

```sh
npx playwright install chromium
npm run pdf
npm run lint
npm run typecheck
npm test
npm run build
npm run test:browser
```

On a fresh Linux runner use `npx playwright install --with-deps chromium`. The PDF is generated from [HTML and print CSS](docs/brief/) and copied from `public/docs/` into the production site. Actions regenerates it and checks the eleven-page count before deployment. Chromium PDF metadata can vary by build.

## Design

- Start with a camera-free pilot using IFS operational events and authorized check-ins. Optional entrance cameras process video locally and produce anonymous crossings that can corroborate site context.
- Use a deterministic state machine and versioned policy checks to produce evidence-linked drafts. Workers correct ambiguity, and managers authorize specific revisions. Calibrated ML suggestions are a later option.
- Start the pilot with one Go service and PostgreSQL. Use Kafka and independently scaled Go/Python services on Azure when fleet needs justify them. Keep permitted evidence in Azure Blob.
- Treat approved, submitted for posting, acknowledged, and reconciled as distinct states. Use target-release-supported IFS integration contracts. IFS Cloud owns the authoritative record.

## Engineering notes

| Topic | Source |
| --- | --- |
| Component boundaries, reconstruction and IFS integration | [Architecture](docs/technical/architecture.md) |
| Design alternatives and trade-offs | [Decision records](docs/technical/architecture-decisions.md) |
| Equations, throughput and benchmarking | [Capacity planning](docs/technical/capacity-planning.md) |
| Receipt OCR, allowance ledger and IFS expense writeback | [Expense specification](docs/technical/expense-processing.md) |
| Event schema and processing semantics | [Event contracts](docs/technical/event-contracts.md) |
| Privacy, tenant isolation and audit | [Security and privacy](docs/technical/security-and-privacy.md) |
| Milestones, metrics and gates | [30-day pilot](docs/technical/pilot-plan.md) |
| Launch gates and scaling strategy | [Production roadmap](docs/technical/production-roadmap.md) |
| Illustrative edge and backend pseudocode | [Reference implementation notes](reference/README.md) |

## Scope and limitations

The hosted application is a static React demonstrator. Fictional worker, work-order and camera evidence lives in the browser. State resets on reload. The mock covers same-day editing for a single workweek, with overnight shifts, multi-order reconciliation and offline client sync designed in the technical notes. Manager decisions stay in the demo. No live camera, Azure, Kafka, payroll or IFS connection is provisioned.

The expense workflow runs English/French OCR in the browser, checks line items against a fictional work-purchase policy and €500 monthly allowance, and demonstrates exception routing. Receipts stay in browser memory. AI-source metadata is an unverified review signal. The demo has no live price feed or reimbursement integration.

Capacity presets are illustrative assumptions in USD. They are editable and contain no measured throughput, production customer footprint, region-specific quota or Azure price quote.

The pilot counts a comparable worker-day as within target when the absolute difference between pre-edit draft and approved reportable minutes is 30 minutes or less. Compare under the same tenant rules and site-local reporting day. Track interval-boundary error and missing draft/reference coverage separately.

This project is independent of IFS. No employee information, credentials, real footage or model weights are included.

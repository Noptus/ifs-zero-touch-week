# Zero-Touch Week

**Less field administration for timesheets and work expenses.**

An independent architecture showcase for an IFS technical interview. Explore two field-service workflows: evidence-backed timesheets and receipt-to-claim expenses.

- [Timesheets](https://noptus.github.io/ifs-zero-touch-week/)
- [Expenses](https://noptus.github.io/ifs-zero-touch-week/expenses/)
- [Architecture brief (PDF)](https://noptus.github.io/ifs-zero-touch-week/docs/zero-touch-week-architecture.pdf)
- [GitHub Pages workflow](.github/workflows/pages.yml)

## Product handoff

Start with one team and compare active employee time, exception load and posting delay with the customer's current workflow. The product requirements define behavior, acceptance checks and integration contracts independent of a cloud, model or ERP. The engineering notes show one Azure and IFS Cloud implementation.

| Feature | Product requirements | Implementation reference |
| --- | --- | --- |
| Field timesheets | [Requirements and acceptance checks](docs/product/timesheet-requirements.md) | [Timesheet architecture](docs/technical/architecture.md) |
| Work expenses | [Requirements and acceptance checks](docs/product/expense-requirements.md) | [Expense architecture](docs/technical/expense-processing.md) |

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

The hosted GitHub Pages showcase has working browser-local receipt OCR, claim review, and saved timesheet approval with CSV export. Neither edition pays claims or writes to IFS. The architecture brief separates the working pilot from the planned enterprise integrations.

Capacity presets are illustrative assumptions in USD. They are editable and contain no measured throughput, production customer footprint, region-specific quota or Azure price quote.

The pilot counts a comparable worker-day as within target when the absolute difference between pre-edit draft and approved reportable minutes is 30 minutes or less. Compare under the same tenant rules and site-local reporting day. Track interval-boundary error and missing draft/reference coverage separately.

This project is independent of IFS. No employee information, credentials, real footage or model weights are included.

## Run the local pilot

```sh
npm ci
npm run build:pilot
PILOT_AUTH=local PILOT_SEED_DEMO=1 npm run pilot
```

Open the [local pilot](http://127.0.0.1:8788/ifs-zero-touch-week/) to submit a timesheet, review it in the manager inbox and download the approved CSV.

To try an expense, open **Expenses → Choose image** or use **Take photo** on a phone. Confirm extracted fields, submit, then reopen the saved claim to review an exception. The $500 USD figure is an eligible reimbursement limit per employee per calendar month. The seed is fictional. US retail benchmarks for the example are [Ryobi drill kit, $98.97](https://www.homedepot.com/p/345174555), [Craftsman drill kit, $99.00](https://www.lowes.com/pd/CRAFTSMAN-20-volt-Max-1-2-in-Keyless-Cordless-Drill-1-Batteries-Included-and-Charger-Included/5018700285) and [chocolate bar, $1.99](https://www.target.com/p/-/A-13347750). Actual prices vary; the demo does not query retailers. A provenance marker is only a review signal; its absence says nothing about authenticity.

The local service is loopback-only, uses SQLite by default and lets the demonstrator play both roles. Omit `PILOT_SEED_DEMO=1` to start without the fictional balance and sample receipt buttons. Use `PILOT_DB` to choose a separate file. The public GitHub Pages edition stores submitted photos and workflow state in this browser’s IndexedDB; clearing site data removes them. The private pilot persists state and evidence in PostgreSQL and checks separate employee/reviewer identities. See the [Azure pilot runbook](infra/README.md).

The product backlog tracks [IFS timesheet reconciliation](https://github.com/Noptus/ifs-zero-touch-week/issues/1), [verified receipt processing](https://github.com/Noptus/ifs-zero-touch-week/issues/2), and [a worksite vision evaluation](https://github.com/Noptus/ifs-zero-touch-week/issues/3).

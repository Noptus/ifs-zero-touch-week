import { ArrowRight, ArrowUpRight, ChevronDown, ClipboardList } from 'lucide-react';
import { CustomerOutcomes, PilotScorecard, productRequirements } from '../CustomerCase';
import SiteFrame, { base } from '../SiteFrame';
import ExpenseDemo from './ExpenseDemo';

const slide = `${base}docs/expense-azure-architecture.svg`;
const specification = 'https://github.com/Noptus/ifs-zero-touch-week/blob/main/docs/technical/expense-processing.md';

const benefits = [
  { audience: 'Employees', text: 'Capture any shop receipt and confirm the proposed work items in one tap.' },
  { audience: 'Approvers', text: 'Focus on unclear items, unusual prices and missing evidence.' },
  { audience: 'Finance', text: 'See committed spend against each allowance and reconcile eligible lines to the ledger.' },
];

const measures = [
  { value: '≥70%', label: 'In-scope claims with one confirmation and no corrections or extra evidence' },
  { value: '≥30%', label: 'Less median active employee time per claim' },
  { value: '0', label: 'Duplicate, over-cap or unauthorized postings in acceptance tests' },
];

export default function ExpensesPage() {
  return <SiteFrame current="expenses">
    <section className="hero-band" aria-labelledby="title">
      <div className="shell hero">
        <div>
          <p className="hero-context">Zero-Touch Week · Independent IFS Cloud proposal</p>
          <h1 id="title">Expenses</h1>
          <p className="hero-description">Help field staff get reimbursed with less paperwork. A receipt photo becomes an itemized claim with eligibility, price and allowance checks.</p>
          <div className="hero-actions">
            <a className="button primary" href="#receipt">Try receipt capture <ArrowRight size={15} /></a>
            <a className="button" href={productRequirements.expenses} target="_blank" rel="noreferrer"><ClipboardList size={15} /> Product requirements</a>
          </div>
        </div>
        <aside className="pilot-target" aria-labelledby="expense-policy">
          <h2 id="expense-policy">Work expense allowance</h2>
          <p className="target-value">€500 <span>per month</span></p>
          <p>Per employee, for eligible work items. A drill can qualify. A chocolate bar on the same receipt is excluded.</p>
        </aside>
      </div>
    </section>
    <CustomerOutcomes benefits={benefits} />
    <section className="shell section" id="receipt">
      <div className="section-title"><h2>Receipt to claim</h2><p>Confirm a clean draft in one tap. Review anything the system cannot resolve.</p></div>
      <ExpenseDemo />
    </section>
    <PilotScorecard
      measures={measures}
      baseline="Use redacted receipts, finance-reviewed outcomes and the current policy. Compare drafts and reviewer effort before testing reimbursement posting."
      example="At 200 claims a month, saving 4 active minutes per claim would free about 13 staff hours per month."
      requirements={productRequirements.expenses}
    />
    <section className="shell section" id="azure-architecture">
      <div className="section-title"><h2>Azure architecture</h2><p>Reference implementation with an IFS Cloud expense adapter.</p></div>
      <figure className="expense-architecture">
        <a href={slide} className="expense-slide" target="_blank" rel="noreferrer">
          <img src={slide} alt="Expense processing in Azure. Capture a receipt, extract it with Document Intelligence, apply Go policy and a PostgreSQL ledger, then post to IFS Cloud or route exceptions to review." width="1120" height="630" loading="lazy" />
        </a>
        <ol className="expense-flow">
          <li><strong>Capture</strong><span>Mobile React → Go API → private Azure Blob</span></li>
          <li><strong>Extract</strong><span>Azure Document Intelligence → structured receipt items</span></li>
          <li><strong>Check</strong><span>Go rules → provenance, price reference and PostgreSQL allowance</span></li>
          <li><strong>Resolve</strong><span>Ready to post to IFS Cloud, or reviewer queue for exceptions</span></li>
        </ol>
        <figcaption>
          <a className="text-button" href={slide} target="_blank" rel="noreferrer">Open architecture slide <ArrowUpRight size={15} /></a>
          <a className="text-button" href={specification} target="_blank" rel="noreferrer">Azure implementation notes <ArrowUpRight size={15} /></a>
        </figcaption>
      </figure>
      <details className="supporting-panel expense-notes">
        <summary>What the checks can tell you <ChevronDown size={16} /></summary>
        <p>For uploads, the demo reads English and French receipt text and looks for an explicit AI-source marker in PNG or JPEG metadata. Photos often carry no usable provenance. Production should combine trusted credentials, duplicate checks, line totals and independent transaction evidence. A price outside a comparable range and an uncertain origin are review signals.</p>
      </details>
    </section>
  </SiteFrame>;
}

import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { ArchitectureDownload, CustomerValue, ProductFeatures, WorkflowLinks, WorkflowSection, productRequirements } from '../CustomerCase';
import SiteFrame, { base } from '../SiteFrame';
import ExpenseDemo from './ExpenseDemo';

const slide = `${base}docs/expense-azure-architecture.svg`;
const specification = 'https://github.com/Noptus/ifs-zero-touch-week/blob/main/docs/technical/expense-processing.md';

const benefits = [
  { label: 'Employees', text: 'Capture any shop receipt and confirm the proposed work items in one tap.' },
  { label: 'Approvers', text: 'Focus on unclear items, unusual prices and missing evidence.' },
  { label: 'Finance', text: 'See approved and reserved amounts against each limit and reconcile eligible lines to the ledger.' },
];

const measures = [
  { value: '≥70%', label: 'In-scope claims with one confirmation and no corrections or extra evidence' },
  { value: '≥30%', label: 'Less median active employee time per claim' },
  { value: '0', label: 'Duplicate, over-cap or unauthorized postings in acceptance tests' },
];

const features = [
  { label: 'Receipt capture', text: 'Take a photo or upload a file. Review and correct the merchant, date, totals and line items.' },
  { label: 'Line item checks', text: 'Check work eligibility, compare against example prices and flag possible duplicates.' },
  { label: 'Reimbursement review', text: 'Route exceptions to a reviewer and track approved or reserved amounts against the monthly limit.' },
];

export default function ExpensesPage() {
  return <SiteFrame current="expenses">
    <div className="hero-band">
      <div className="shell hero">
        <div>
          <p className="hero-context">Zero-Touch Week · Independent IFS Cloud proposal</p>
          <h1 id="title">Expenses</h1>
          <p className="hero-description">Help field staff get reimbursed with less paperwork. A receipt photo becomes an itemized claim with eligibility, price and allowance checks.</p>
          <WorkflowLinks demo="receipt" architecture="azure-architecture" />
        </div>
      </div>
    </div>
    <WorkflowSection id="receipt" title="Demo" description="Upload a receipt or try a sample. Confirm the claim or send it for review.">
      <ExpenseDemo />
    </WorkflowSection>
    <CustomerValue
      benefits={benefits}
      measures={measures}
      example="At 200 claims a month, saving 4 active minutes per claim would free about 13 staff hours per month."
    >
        <aside className="pilot-target" aria-labelledby="expense-policy">
          <h3 id="expense-policy">Monthly reimbursement limit</h3>
          <p className="target-value">$500 <span>USD / month</span></p>
          <p>Maximum eligible reimbursement per employee. Actual spend depends on approved claims. A drill can qualify. A chocolate bar on the same receipt is excluded.</p>
        </aside>
    </CustomerValue>
    <WorkflowSection id="azure-architecture" title="Architecture" description="The Azure pilot runs React, Node.js and private PostgreSQL. The diagram shows the planned production integrations.">
      <figure className="expense-architecture">
        <a href={slide} className="expense-slide" target="_blank" rel="noreferrer">
          <img src={slide} alt="Expense processing in Azure. Capture a receipt, extract it with Document Intelligence, apply policy and a PostgreSQL ledger, then post to IFS Cloud or route exceptions to review." width="1120" height="630" loading="lazy" />
        </a>
        <ol className="expense-flow">
          <li><strong>Capture</strong><span>Mobile React → receipt API → private Azure Blob</span></li>
          <li><strong>Extract</strong><span>Azure Document Intelligence → structured receipt items</span></li>
          <li><strong>Check</strong><span>Policy rules → provenance, price reference and PostgreSQL allowance</span></li>
          <li><strong>Resolve</strong><span>Ready to post to IFS Cloud, or reviewer queue for exceptions</span></li>
        </ol>
        <figcaption>
          <a className="text-button" href={slide} target="_blank" rel="noreferrer">Open architecture slide <ArrowUpRight size={15} /></a>
          <a className="text-button" href={specification} target="_blank" rel="noreferrer">Azure implementation notes <ArrowUpRight size={15} /></a>
          <ArchitectureDownload />
        </figcaption>
      </figure>
    </WorkflowSection>
    <ProductFeatures features={features} requirements={productRequirements.expenses}>
      <details className="supporting-panel expense-notes section-followup">
        <summary>What the checks can tell you <ChevronDown size={16} /></summary>
        <p>For uploads, the demo reads English and French receipt text and looks for an explicit AI-source marker in PNG or JPEG metadata. Photos often carry no usable provenance. Production should combine trusted credentials, duplicate checks, line totals and independent transaction evidence. A price outside a comparable range and an uncertain origin are review signals.</p>
      </details>
    </ProductFeatures>
  </SiteFrame>;
}

import type { ReactNode } from 'react';
import { ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { pdf } from './SiteFrame';

export const productRequirements = {
  timesheets: 'https://github.com/Noptus/ifs-zero-touch-week/blob/main/docs/product/timesheet-requirements.md',
  expenses: 'https://github.com/Noptus/ifs-zero-touch-week/blob/main/docs/product/expense-requirements.md',
};

type Detail = { label: string; text: string };
type Measure = { value: string; label: string };

export function WorkflowLinks({ demo, architecture }: { demo: string; architecture: string }) {
  return <nav className="workflow-links" aria-label="On this page">
    <a className="button small primary" href={`#${demo}`}>Demo</a>
    <a className="button small" href="#value">Value</a>
    <a className="button small" href={`#${architecture}`}>Architecture</a>
    <a className="button small" href="#features">Features</a>
  </nav>;
}

export function WorkflowSection({ id, title, description, children }: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return <section className="shell section" id={id} aria-labelledby={`${id}-heading`}>
    <div className="section-title">
      <h2 id={`${id}-heading`}>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    {children}
  </section>;
}

function DetailList({ details }: { details: Detail[] }) {
  return <dl className="workflow-details">
    {details.map(({ label, text }) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}
  </dl>;
}

export function CustomerValue({ benefits, measures, example, children }: {
  benefits: Detail[];
  measures: Measure[];
  example: string;
  children?: ReactNode;
}) {
  return <WorkflowSection id="value" title="Value" description={example}>
    <div className="pilot-card">
      <DetailList details={benefits} />
      <div className="value-measures">
        <h3>Proposed pilot targets</h3>
        <dl className="pilot-measures">
          {measures.map(({ value, label }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
      </div>
      {children}
    </div>
  </WorkflowSection>;
}

export function ProductFeatures({ features, requirements, children }: {
  features: Detail[];
  requirements: string;
  children?: ReactNode;
}) {
  return <WorkflowSection id="features" title="Features">
    <div className="pilot-card">
      <DetailList details={features} />
      <div className="pilot-links">
        <a className="text-button" href={requirements} target="_blank" rel="noreferrer">Product requirements <ArrowUpRight size={15} /></a>
      </div>
    </div>
    {children}
  </WorkflowSection>;
}

export function ArchitectureDownload() {
  return <a className="text-button" href={pdf} download><ArrowDownToLine size={15} /> Download architecture PDF</a>;
}

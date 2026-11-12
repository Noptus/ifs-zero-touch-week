import { ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { pdf } from './SiteFrame';

export const productRequirements = {
  timesheets: 'https://github.com/Noptus/ifs-zero-touch-week/blob/main/docs/product/timesheet-requirements.md',
  expenses: 'https://github.com/Noptus/ifs-zero-touch-week/blob/main/docs/product/expense-requirements.md',
};

type Benefit = { audience: string; text: string };
type Measure = { value: string; label: string };

export function CustomerOutcomes({ benefits }: { benefits: Benefit[] }) {
  return <section className="shell customer-outcomes" aria-labelledby="customer-outcomes">
    <h2 id="customer-outcomes">What changes for the customer</h2>
    <dl>{benefits.map(({ audience, text }) => <div key={audience}><dt>{audience}</dt><dd>{text}</dd></div>)}</dl>
  </section>;
}

export function PilotScorecard({ measures, baseline, example, requirements }: {
  measures: Measure[];
  baseline: string;
  example: string;
  requirements: string;
}) {
  return <section className="shell section pilot-scorecard" aria-labelledby="pilot-scorecard">
    <div className="section-title"><h2 id="pilot-scorecard">Pilot scorecard</h2><p>Proposed gates to agree with the customer before shadow mode.</p></div>
    <div className="pilot-card">
      <dl className="pilot-measures">{measures.map(({ value, label }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="pilot-plan">
        <div><h3>Start with one team</h3><p>{baseline}</p></div>
        <div><h3>Illustrative time saved</h3><p>{example}</p></div>
      </div>
      <div className="pilot-links">
        <a className="text-button" href={requirements} target="_blank" rel="noreferrer">Read the feature requirements <ArrowUpRight size={15} /></a>
        <a className="text-button" href={pdf} download><ArrowDownToLine size={15} /> Download architecture PDF</a>
      </div>
    </div>
  </section>;
}

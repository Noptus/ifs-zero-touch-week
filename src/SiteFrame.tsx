import type { ReactNode } from 'react';
import { Activity, ArrowDown, ArrowUpRight, FileText } from 'lucide-react';

export const base = import.meta.env.BASE_URL;
export const pdf = `${base}docs/zero-touch-week-architecture.pdf`;

export default function SiteFrame({ current, children }: { current: 'timesheets' | 'expenses' | 'live'; children: ReactNode }) {
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a href={base} className="brand" aria-label="Zero-Touch Week home">Zero-Touch Week</a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href={base} aria-current={current === 'timesheets' ? 'page' : undefined}>Timesheets</a>
          <a href={`${base}expenses/`} aria-current={current === 'expenses' ? 'page' : undefined}>Expenses</a>
        <a href={`${base}live/`} aria-current={current === 'live' ? 'page' : undefined}>Live feed</a>
        </nav>
        <a className="button small header-doc" href={pdf} target="_blank" rel="noreferrer"><FileText size={15} /> Architecture PDF <ArrowUpRight size={14} /></a>
      </div>
    </header>
    <main id="main">{children}</main>
    <footer className="site-footer">
      <div className="shell">
        <span><Activity size={18} /> Independent IFS Cloud proposal</span>
        <a href="https://github.com/Noptus/ifs-zero-touch-week" target="_blank" rel="noreferrer">Source on GitHub <ArrowUpRight size={15} /></a>
        <a href="#main">Back to top <ArrowDown className="flip" size={14} /></a>
      </div>
    </footer>
  </>;
}

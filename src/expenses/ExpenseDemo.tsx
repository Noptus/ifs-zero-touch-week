import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ArrowRight, Camera, Check, ChevronDown, CircleAlert, FileImage, ReceiptText, Upload } from 'lucide-react';
import { base } from '../SiteFrame';
import { allowance, assess, euros, flaggedReceipt, receiptKeys, sampleMonth, sampleReceipt, startingLedger, validDate } from './policy';
import type { Line, Receipt } from './policy';
import { parseMoney } from './receiptText';

type Claim = { receipt: Receipt; originalKeys: string[]; image: string };
type Result = { state: 'ready' | 'review'; eligible: number; possibleDuplicate: boolean };
type Session = { ledger: Record<string, number>; submitted: string[]; result: Result | null };

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const imageAccept = imageTypes.join(',');
const blankLine: Line = { description: '', quantity: 1, cents: null };
const amountText = (cents: number | null) => cents === null ? '' : (cents / 100).toFixed(2);
const hasMatchingKey = (keys: string[], submitted: string[], prefix: string) =>
  keys.some(key => key.startsWith(prefix) && submitted.includes(key));

function displayAmount(cents: number | null, currency: string) {
  if (cents === null) return '—';
  if (currency === 'EUR') return euros(cents);
  return `${amountText(cents)}${currency ? ` ${currency}` : ''}`;
}

export default function ExpenseDemo() {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [session, setSession] = useState<Session>({ ledger: startingLedger, submitted: [], result: null });
  const [scanning, setScanning] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const receipt = claim?.receipt;
  const month = receipt && validDate(receipt.date) ? receipt.date.slice(0, 7) : '';
  const balanceMonth = receipt ? month : sampleMonth;
  const spent = session.ledger[balanceMonth] ?? 0;
  const result = session.result;
  const keys = claim ? [...new Set([...claim.originalKeys, ...receiptKeys(claim.receipt)])] : [];
  const duplicate = !result && hasMatchingKey(keys, session.submitted, 'file:');
  const possibleDuplicate = result?.possibleDuplicate ?? (!duplicate && hasMatchingKey(keys, session.submitted, 'transaction:'));
  const check = receipt ? assess(receipt, spent - (result?.state === 'ready' ? result.eligible : 0), possibleDuplicate) : null;

  function start(receipt: Receipt, image: string) {
    setClaim({ receipt, originalKeys: receiptKeys(receipt), image });
    setSession(current => ({ ...current, result: null }));
    setError('');
  }

  function loadSample(flagged: boolean) {
    setPhotoUrl('');
    start(flagged ? flaggedReceipt : sampleReceipt, `${base}receipts/${flagged ? 'flagged-shop.png' : 'hardware-shop.png'}`);
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || scanning !== null) return;
    if (!imageTypes.includes(file.type) || file.size > 12 * 1024 * 1024) {
      setError('Choose a JPEG, PNG or WebP image under 12 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setClaim(null);
    setError('');
    setScanning(0);
    try {
      const { scanReceipt } = await import('./scanReceipt');
      start(await scanReceipt(file, setScanning), url);
    } catch {
      setPhotoUrl('');
      setError('Could not read this photo. Try a sharp, well-lit image or open a sample.');
    } finally {
      setScanning(null);
    }
  }

  function edit(patch: Partial<Receipt>) {
    setClaim(current => current ? { ...current, receipt: { ...current.receipt, ...patch, corrected: true } } : null);
  }

  function editLine(index: number, patch: Partial<Line>) {
    if (receipt) edit({ lines: receipt.lines.map((line, i) => i === index ? { ...line, ...patch } : line) });
  }

  function submit() {
    if (!receipt || !keys.length || !receipt.lines.length) return;
    setSession(current => {
      if (current.result || hasMatchingKey(keys, current.submitted, 'file:')) return current;
      const used = current.ledger[month] ?? 0;
      const possibleDuplicate = hasMatchingKey(keys, current.submitted, 'transaction:');
      const outcome = assess(receipt, used, possibleDuplicate);
      if (!outcome.needsReview && outcome.eligible === 0) return current;
      const ready = !outcome.needsReview;
      return {
        ledger: ready ? { ...current.ledger, [month]: used + outcome.eligible } : current.ledger,
        submitted: [...current.submitted, ...keys],
        result: { state: ready ? 'ready' : 'review', eligible: outcome.eligible, possibleDuplicate },
      };
    });
  }

  return <div className="expense-panel">
    <div className="expense-capture">
      <div className="expense-upload">
        <h3><ReceiptText size={17} /> Capture receipt</h3>
        <p>Use a photo from any shop. OCR runs in this browser.</p>
        <div className="expense-actions">
          <label className="button primary upload-button">
            <Camera size={15} /> Take photo
            <input className="sr-only" aria-label="Take photo" type="file" accept={imageAccept} capture="environment" disabled={scanning !== null} onChange={upload} />
          </label>
          <label className="button upload-button">
            <Upload size={15} /> Choose image
            <input className="sr-only" aria-label="Choose receipt image" type="file" accept={imageAccept} disabled={scanning !== null} onChange={upload} />
          </label>
        </div>
        <div className="expense-actions sample-actions">
          <button type="button" className="text-button" disabled={scanning !== null} onClick={() => loadSample(false)}>Try sample receipt</button>
          <button type="button" className="text-button" disabled={scanning !== null} onClick={() => loadSample(true)}>Try flagged sample</button>
        </div>
        {scanning !== null && <p className="scan-progress" role="status">Reading receipt… {scanning}%</p>}
        {error && <p className="inline-note" role="alert"><CircleAlert size={15} /> {error}</p>}
      </div>
      <aside className="expense-allowance" aria-label="Monthly allowance">
        <span className="micro">{balanceMonth ? `MONTHLY ALLOWANCE · ${balanceMonth}` : 'MONTHLY ALLOWANCE'}</span>
        <strong>{euros(allowance)}</strong>
        <p>{balanceMonth ? <>{euros(spent)} used or reserved · <b>{euros(Math.max(0, allowance - spent))} left</b></> : 'Confirm the purchase date to check the balance.'}</p>
        <small>{balanceMonth === sampleMonth ? 'Includes fictional prior claims.' : 'Demo ledger for this session.'}</small>
      </aside>
    </div>
    {claim && receipt && check && <div className="expense-review">
      <figure className="receipt-figure">
        <figcaption><FileImage size={15} /> {receipt.source === 'sample' ? 'Fictional shop receipt' : 'Receipt photo'}</figcaption>
        <img src={claim.image} alt={receipt.source === 'sample' ? 'Fictional Harbor Hardware receipt' : 'Uploaded receipt photo'} />
      </figure>
      <div className="expense-items">
        <div className="expense-review-head">
          <div>
            <h3>{receipt.merchant || 'Receipt details'}</h3>
            <p>{[receipt.date, displayAmount(receipt.total, receipt.currency)].filter(Boolean).join(' · ')}</p>
          </div>
          <span className={`tag ${receipt.aiSignal ? 'warning' : ''}`}>{receipt.aiSignal ? 'AI-source marker found' : 'Origin unverified'}</span>
        </div>
        <div className="expense-lines" aria-label="Itemized receipt">
          {receipt.lines.map((line, i) => {
            const item = check.decisions[i];
            return <div className="expense-line" key={i}>
              <div><strong>{line.description || 'Unidentified item'}</strong><small>{line.quantity > 1 && `${line.quantity} × `}{item.reason}</small></div>
              <strong>{displayAmount(line.cents, receipt.currency)}</strong>
              <span className={`tag ${item.status === 'Eligible' ? 'green' : item.status === 'Review' ? 'warning' : ''}`}>{item.status}</span>
            </div>;
          })}
          {!receipt.lines.length && <p className="inline-note"><CircleAlert size={15} /> No line items were extracted. Add them in the receipt editor.</p>}
        </div>
        {!result && <details className="expense-editor">
          <summary>Correct receipt details <ChevronDown size={15} /></summary>
          <div className="expense-fields">
            <label>Merchant<input value={receipt.merchant} maxLength={100} onChange={e => edit({ merchant: e.target.value })} /></label>
            <label>Purchase date<input type="date" value={receipt.date} onChange={e => edit({ date: e.target.value })} /></label>
            <label>Currency<select value={receipt.currency} onChange={e => edit({ currency: e.target.value })}><option value="">Unconfirmed</option><option>EUR</option><option>USD</option><option>GBP</option></select></label>
            <MoneyInput label="Receipt total" cents={receipt.total} onEdit={total => edit({ total })} />
          </div>
          {receipt.lines.map((line, i) => <div className="expense-fields edit-line" key={i}>
            <label>Item {i + 1}<input value={line.description} maxLength={100} onChange={e => editLine(i, { description: e.target.value })} /></label>
            <label>Quantity {i + 1}<input type="number" min="1" max="1000" value={line.quantity || ''} onChange={e => editLine(i, { quantity: Number(e.target.value) })} /></label>
            <MoneyInput label={`Amount ${i + 1}`} cents={line.cents} onEdit={cents => editLine(i, { cents })} />
            <button type="button" className="text-button" onClick={() => edit({ lines: receipt.lines.filter((_, index) => index !== i) })}>Remove item {i + 1}</button>
          </div>)}
          <button type="button" className="text-button" disabled={receipt.lines.length >= 50} onClick={() => edit({ lines: [...receipt.lines, blankLine] })}>Add item</button>
        </details>}
        {check.issues.length > 0 && <ul className="expense-issues">
          {check.issues.map(issue => <li className="inline-note" key={issue}><CircleAlert size={15} /> {issue}</li>)}
        </ul>}
        {duplicate && <p className="inline-note" role="alert"><CircleAlert size={15} /> This receipt was already submitted in this session.</p>}
        <div className="expense-submit">
          <div><small>Policy-eligible items</small><strong>{euros(check.eligible)}</strong></div>
          {!result && <button type="button" className="button primary" disabled={duplicate || !keys.length || !receipt.lines.length || (!check.needsReview && check.eligible === 0)} onClick={submit}>
            {check.needsReview ? 'Send for review' : 'Confirm and submit'} <ArrowRight size={15} />
          </button>}
        </div>
        {result ? <p className={`inline-note ${result.state === 'ready' ? 'positive' : ''}`} role="status">
          {result.state === 'ready' ? <><Check size={16} /> {euros(result.eligible)} reserved in the demo ledger. Ready for reimbursement processing.</> : <><CircleAlert size={16} /> Sent to exception review in the demo. The allowance is unchanged.</>}
        </p> : <p className="expense-attestation">By submitting, you confirm work use for the included items. This demo makes no payment.</p>}
      </div>
    </div>}
  </div>;
}

function MoneyInput({ label, cents, onEdit }: { label: string; cents: number | null; onEdit: (cents: number | null) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  return <label>{label}
    <input inputMode="decimal" value={editing ?? amountText(cents)} onChange={event => {
      setEditing(event.target.value);
      onEdit(parseMoney(event.target.value));
    }} onBlur={() => setEditing(null)} />
  </label>;
}

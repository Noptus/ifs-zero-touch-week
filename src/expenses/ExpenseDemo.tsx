import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ArrowRight, Camera, Check, ChevronDown, CircleAlert, FileImage, ReceiptText, Upload } from 'lucide-react';
import { base } from '../SiteFrame';
import { allowance, assess, dollars, flaggedReceipt, receiptKeys, sampleMonth, sampleReceipt, validDate } from './policy';
import type { Line, Receipt } from './policy';
import { parseMoney } from './receiptText';
import { receiptPhoto, usePilot } from '../pilot/client';
import { isReceiptMatch, spentFor } from '../pilot/model';
import type { Claim as SavedClaim } from '../pilot/model';

type Claim = { id: string; revision: number; receipt: Receipt; image: string };
const stateLabels = { review: 'Awaiting review', reserved: 'Reserved', approved: 'Approved', returned: 'Changes requested', rejected: 'Rejected' };

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const imageAccept = imageTypes.join(',');
const blankLine: Line = { description: '', quantity: 1, cents: null };
const amountText = (cents: number | null) => cents === null ? '' : (cents / 100).toFixed(2);
function displayAmount(cents: number | null, currency: string) {
  if (cents === null) return '—';
  if (currency === 'USD') return dollars(cents);
  return `${amountText(cents)}${currency ? ` ${currency}` : ''}`;
}

export default function ExpenseDemo() {
  const [claim, setClaim] = useState<Claim | null>(null);
  const pilot = usePilot();
  const pendingPhoto = useRef<Blob | null>(null);
  const [correcting, setCorrecting] = useState(false);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [photoMissing, setPhotoMissing] = useState(false);
  const [scanning, setScanning] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  const receipt = claim?.receipt;
  const month = receipt && validDate(receipt.date) ? receipt.date.slice(0, 7) : '';
  const balanceMonth = receipt ? month : (pilot.actor.demo ? sampleMonth : new Date().toISOString().slice(0, 7));
  const spent = spentFor(pilot.workspace, balanceMonth, pilot.actor.demo);
  const saved = pilot.workspace.claims.find(entry => entry.id === claim?.id);
  const stale = Boolean(saved && claim && saved.revision !== claim.revision);
  const result = correcting && !stale ? undefined : saved;
  const keys = receipt ? receiptKeys(receipt) : [];
  const duplicate = !result && isReceiptMatch(keys, pilot.workspace.claims, 'file:', claim?.id);
  const possibleDuplicate = !duplicate && isReceiptMatch(keys, pilot.workspace.claims, 'transaction:', claim?.id);
  const check = receipt ? assess(receipt, spent - (['reserved', 'approved'].includes(saved?.state ?? '') ? (saved?.amount ?? 0) : 0), possibleDuplicate) : null;

  function start(receipt: Receipt, image: string, id: string = crypto.randomUUID(), revision = 0) {
    setClaim({ id, revision, receipt, image });
    setCorrecting(false);
    setNote('');
    setSelected([]);
    setPhotoMissing(false);
    setError('');
  }

  function loadSample(flagged: boolean) {
    pendingPhoto.current = null;
    setPhotoUrl('');
    start(flagged ? flaggedReceipt : sampleReceipt, `${base}receipts/${flagged ? 'flagged-shop.png' : 'hardware-shop.png'}`);
  }

  async function openSaved(entry: SavedClaim) {
    pendingPhoto.current = null;
    if (entry.receipt.source === 'sample') {
      setPhotoUrl('');
      start(entry.receipt, `${base}receipts/${entry.receipt.aiSignal ? 'flagged-shop.png' : 'hardware-shop.png'}`, entry.id, entry.revision);
      return;
    }
    try {
      const file = entry.receipt.digest && await receiptPhoto(entry.receipt.digest);
      const url = file ? URL.createObjectURL(file) : '';
      setPhotoUrl(url);
      start(entry.receipt, url, entry.id, entry.revision);
      setPhotoMissing(!url);
    } catch { setError('Could not open the saved receipt photo.'); }
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
    pendingPhoto.current = file;
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

  async function submit() {
    if (!receipt || !claim || !keys.length || !receipt.lines.length) return;
    const next = await pilot.run({ type: 'expense.submit', id: claim.id, revision: claim.revision, receipt: { ...receipt, currency: receipt.currency as 'USD' | 'EUR' | 'GBP' | '' } }, pendingPhoto.current ?? undefined);
    if (next) {
      const record = next.workspace.claims.find(entry => entry.id === claim.id)!;
      setClaim({ ...claim, revision: record.revision, receipt: record.receipt });
      setCorrecting(false);
      pendingPhoto.current = null;
    }
  }

  async function review(decision: 'approved' | 'returned' | 'rejected') {
    if (!saved || !claim || stale) return;
    const next = await pilot.run({ type: 'expense.review', id: saved.id, revision: saved.revision, decision, note, lineIndexes: selected });
    if (next) {
      setClaim({ ...claim, revision: saved.revision + 1 });
      setNote('');
      setSelected([]);
    }
  }

  return <div className="expense-panel">
    <div className="expense-capture">
      <div className="expense-upload">
        <h3><ReceiptText size={17} /> Capture receipt</h3>
        <p>Use a photo from any shop. OCR runs in this browser.</p>
        <div className="expense-actions">
          <label className="button primary upload-button">
            <Camera size={15} /> Take photo
            <input className="sr-only" aria-label="Take photo" type="file" accept={imageAccept} capture="environment" disabled={scanning !== null || pilot.busy || !pilot.actor.canSubmit} onChange={upload} />
          </label>
          <label className="button upload-button">
            <Upload size={15} /> Choose image
            <input className="sr-only" aria-label="Choose receipt image" type="file" accept={imageAccept} disabled={scanning !== null || pilot.busy || !pilot.actor.canSubmit} onChange={upload} />
          </label>
        </div>
        {pilot.actor.demo && <div className="expense-actions sample-actions">
          <button type="button" className="text-button" disabled={scanning !== null || pilot.busy || !pilot.actor.canSubmit} onClick={() => loadSample(false)}>Try sample receipt</button>
          <button type="button" className="text-button" disabled={scanning !== null || pilot.busy || !pilot.actor.canSubmit} onClick={() => loadSample(true)}>Try flagged sample</button>
        </div>}
        {scanning !== null && <p className="scan-progress" role="status">Reading receipt… {scanning}%</p>}
        {(error || pilot.error) && <p className="inline-note" role="alert"><CircleAlert size={15} /> {error || pilot.error}</p>}
      </div>
      <aside className="expense-allowance" aria-label="Monthly allowance">
        <span className="micro">{balanceMonth ? `MONTHLY REIMBURSEMENT LIMIT · USD · ${balanceMonth}` : 'MONTHLY REIMBURSEMENT LIMIT · USD'}</span>
        <strong>{dollars(allowance)}</strong>
        <p>{balanceMonth ? <>{dollars(spent)} used or reserved · <b>{dollars(Math.max(0, allowance - spent))} left</b></> : 'Confirm the purchase date to check the balance.'}</p>
        <small>{pilot.actor.demo && balanceMonth === sampleMonth ? 'Per employee. Includes $320 in fictional prior claims.' : 'Per employee, per calendar month.'}</small>
      </aside>
    </div>
    <div className="claim-history">
      <div className="expense-actions"><strong>Saved claims</strong><button type="button" className="text-button" disabled={pilot.busy} onClick={() => { void pilot.run(); }}>Refresh</button></div>
      {!pilot.workspace.claims.length && <small>No submissions yet.</small>}
      {pilot.workspace.claims.map(entry => <button className="button small" key={entry.id} type="button" disabled={pilot.busy || scanning !== null} aria-pressed={claim?.id === entry.id} onClick={() => { void openSaved(entry); }}>
        {entry.receipt.merchant || 'Receipt'} · {entry.receipt.date || 'Undated'} · {stateLabels[entry.state]}
      </button>)}
    </div>
    {claim && receipt && check && <div className="expense-review">
      <figure className="receipt-figure">
        <figcaption><FileImage size={15} /> {receipt.source === 'sample' ? 'Fictional shop receipt' : 'Receipt photo'}</figcaption>
        {claim.image && <img src={claim.image} alt={receipt.source === 'sample' ? 'Fictional Harbor Hardware receipt' : 'Uploaded receipt photo'} />}
        {photoMissing && <p>Original photo unavailable.</p>}
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
        {duplicate && <p className="inline-note" role="alert"><CircleAlert size={15} /> This receipt was already submitted.</p>}
        <div className="expense-submit">
          <div><small>Policy-eligible items</small><strong>{dollars(check.eligible)}</strong></div>
          {!result && <button type="button" className="button primary" disabled={!pilot.actor.canSubmit || pilot.busy || duplicate || !keys.length || !receipt.lines.length || (!check.needsReview && check.eligible === 0)} onClick={submit}>
            {duplicate ? 'Already submitted' : check.needsReview || !pilot.actor.demo ? 'Send for review' : 'Confirm and submit'} <ArrowRight size={15} />
          </button>}
        </div>
        {result ? <p className={`inline-note ${['approved', 'reserved'].includes(result.state) ? 'positive' : ''}`} role="status">
          {result.state === 'reserved' ? <><Check size={16} /> {dollars(result.amount)} reserved in the demo ledger.</> :
            result.state === 'approved' ? <><Check size={16} /> {dollars(result.amount)} approved. No payment has been made.</> :
              result.state === 'review' ? <><CircleAlert size={16} /> Sent to exception review. The limit balance is unchanged.</> :
                <><CircleAlert size={16} /> {stateLabels[result.state]}: {result.note}</>}
        </p> : <p className="expense-attestation">By submitting, you confirm work use for the included items. This demo makes no payment.</p>}
        {stale && saved && <button type="button" className="button small" onClick={() => { void openSaved(saved); }}>Open latest revision</button>}
        {!stale && result?.state === 'returned' && pilot.actor.canSubmit && <button type="button" className="button small" onClick={() => setCorrecting(true)}>Correct and resubmit</button>}
        {!stale && result?.state === 'review' && pilot.actor.canReview && <details className="expense-editor">
          <summary>Reviewer decision <ChevronDown size={15} /></summary>
          <p>Compare with the original photo, verify work use and check any pricing exception before selecting lines.</p>
          {receipt.lines.map((line, i) => <label className="checkbox" key={i}>
            <input type="checkbox" disabled={check.decisions[i].status === 'Excluded' || !line.cents} checked={selected.includes(i)} onChange={e => setSelected(previous => e.target.checked ? [...previous, i] : previous.filter(index => index !== i))} />
            {line.description || 'Unidentified item'} · {displayAmount(line.cents, receipt.currency)}
          </label>)}
          <label className="reason">Review note<textarea value={note} maxLength={500} onChange={e => setNote(e.target.value)} rows={2} /></label>
          <div className="expense-actions">
            <button type="button" className="button primary small" disabled={pilot.busy || !note.trim() || !selected.length || receipt.currency !== 'USD'} onClick={() => { void review('approved'); }}>Approve selected</button>
            <button type="button" className="button small" disabled={pilot.busy || !note.trim()} onClick={() => { void review('returned'); }}>Request changes</button>
            <button type="button" className="button small danger" disabled={pilot.busy || !note.trim()} onClick={() => { void review('rejected'); }}>Reject</button>
          </div>
        </details>}
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

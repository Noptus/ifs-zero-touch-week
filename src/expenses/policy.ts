export type Line = { description: string; quantity: number; cents: number | null };
export type Receipt = {
  merchant: string;
  date: string;
  currency: string;
  total: number | null;
  lines: Line[];
  source: 'sample' | 'photo';
  aiSignal: boolean;
  lowConfidence?: boolean;
  corrected?: boolean;
  digest?: string;
};

export const allowance = 50_000;
export const sampleMonth = '2026-11';
export const startingLedger = { [sampleMonth]: 32_000 };
export const sampleReceipt: Receipt = {
  merchant: 'Harbor Hardware', date: '2026-11-09', currency: 'EUR', total: 9_230,
  lines: [
    { description: 'Cordless drill', quantity: 1, cents: 8_990 },
    { description: 'Chocolate bar', quantity: 1, cents: 240 },
  ],
  source: 'sample', aiSignal: false, digest: 'sample-hardware-09',
};
export const flaggedReceipt: Receipt = {
  ...sampleReceipt, date: '2026-11-10', total: 20_230, aiSignal: true, digest: 'sample-hardware-10',
  lines: [{ description: 'Cordless drill', quantity: 1, cents: 19_990 }, sampleReceipt.lines[1]],
};

const euro = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

export function euros(cents: number) {
  return euro.format(cents / 100);
}

export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function receiptKeys(receipt: Receipt) {
  const merchant = receipt.merchant.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]/gu, '');
  const keys = receipt.digest ? [`file:${receipt.digest}`] : [];
  if (merchant && validDate(receipt.date) && receipt.total !== null && receipt.currency) {
    keys.push(`transaction:${JSON.stringify([merchant, receipt.date, receipt.currency, receipt.total])}`);
  }
  return keys;
}

type Decision = { status: 'Eligible' | 'Excluded' | 'Review'; reason: string; work: boolean };

function decide(line: Line, currency: string): Decision {
  const name = line.description.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\b(chocolate|chocolat|candy|bonbon|snack|soda)\b/.test(name)) {
    return { status: 'Excluded', reason: 'Personal item under the pilot policy.', work: false };
  }
  const cordlessDrill = /\bcordless drill\b|\bperceuse sans fil\b/.test(name);
  const work = cordlessDrill || /\b(drill|perceuse|wrench|screwdriver|gloves|spanner|tournevis|gants|safety glasses)\b/.test(name);
  if (!line.description.trim() || line.cents === null || line.cents <= 0 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 1000) {
    return { status: 'Review', reason: 'Confirm the item, quantity and amount.', work };
  }
  if (!work) return { status: 'Review', reason: 'Work purpose needs confirmation.', work: false };
  if (currency !== 'EUR') return { status: 'Review', reason: 'Confirm currency and conversion before applying the EUR allowance.', work: true };
  if (!cordlessDrill) return { status: 'Review', reason: 'Work category matched. A comparable price is needed.', work: true };
  const minimum = 4_000 * line.quantity;
  const maximum = 14_000 * line.quantity;
  if (line.cents < minimum || line.cents > maximum) {
    return { status: 'Review', reason: 'Outside the example €40–€140 range per cordless drill.', work: true };
  }
  return { status: 'Eligible', reason: 'Work tool within the example €40–€140 range per drill.', work: true };
}

export function assess(receipt: Receipt, spent: number, possibleDuplicate = false) {
  const decisions = receipt.lines.map(line => decide(line, receipt.currency));
  const eligible = receipt.lines.reduce((sum, line, i) => sum + (decisions[i].status === 'Eligible' ? line.cents ?? 0 : 0), 0);
  const workRequested = receipt.lines.reduce((sum, line, i) => sum + (decisions[i].work ? line.cents ?? 0 : 0), 0);
  const remaining = Math.max(0, allowance - spent);
  const issues: string[] = [];
  if (possibleDuplicate) issues.push('A similar transaction was already submitted. Check the original before reimbursement.');
  if (receipt.aiSignal) issues.push('AI-generation metadata was found. It is an unverified signal and needs review.');
  if (receipt.lowConfidence) issues.push('Low scan confidence. Compare the extracted fields with the photo.');
  if (receipt.corrected) issues.push('Receipt fields were corrected. A reviewer checks the changes against the photo.');
  const missingDetails = [
    !receipt.merchant.trim() && 'merchant',
    !validDate(receipt.date) && 'purchase date',
    (receipt.total === null || receipt.total <= 0) && 'receipt total',
  ].filter(Boolean);
  if (missingDetails.length) issues.push(`Missing details: ${missingDetails.join(', ')}.`);
  if (receipt.currency !== 'EUR') issues.push('EUR is required for automatic allowance checks.');
  if (!receipt.lines.length) issues.push('Add at least one receipt item.');
  const lineTotal = receipt.lines.reduce((sum, line) => sum + (line.cents ?? 0), 0);
  if (receipt.total !== null && receipt.lines.length > 0 && receipt.lines.every(line => line.cents !== null) && lineTotal !== receipt.total) {
    issues.push('Item amounts do not add up to the receipt total. Check for tax, discounts or missing lines.');
  }
  if (receipt.currency === 'EUR' && workRequested > remaining) issues.push('Work items exceed the remaining monthly allowance.');
  const needsReview = issues.length > 0 || decisions.some(item => item.status === 'Review');
  return { decisions, eligible, remaining, issues, needsReview };
}

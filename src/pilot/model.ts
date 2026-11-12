import { z } from 'zod';
import { activities, makeWeek, projects, reportableMinutes, validate } from '../workflow';
import type { Interval } from '../workflow';
import { allowance, assess, receiptKeys, sampleMonth, startingLedger, validDate } from '../expenses/policy';
import type { Receipt } from '../expenses/policy';

export const exampleWeek = '2026-11-09';
type Decision = 'approved' | 'returned' | 'rejected';
export type Actor = { id: string; canSubmit: boolean; canReview: boolean; demo: boolean };
export const browserActor: Actor = { id: 'browser-workspace', canSubmit: true, canReview: true, demo: true };
export type TimeSheet = { rows: Interval[]; state: 'submitted' | Decision; revision: number; note: string; updatedAt: string };
export type Claim = {
  id: string;
  receipt: Receipt;
  keys: string[];
  state: 'review' | 'reserved' | Decision;
  revision: number;
  amount: number;
  lineIndexes: number[];
  note: string;
  updatedAt: string;
};
export type Workspace = { timesheets: Record<string, TimeSheet>; claims: Claim[] };
export const emptyWorkspace: Workspace = { timesheets: {}, claims: [] };
export type Snapshot = { workspace: Workspace; actor: Actor };

const id = z.string().regex(/^[a-zA-Z0-9-]+$/).max(80);
const amount = z.number().int().nonnegative().max(100_000_000);
const date = z.string().refine(validDate, 'Enter a valid date.');
const week = date.refine(value => new Date(value).getUTCDay() === 1, 'The week must start on Monday.');
const line = z.object({
  description: z.string().max(100),
  quantity: z.number().int().min(0).max(1000),
  cents: amount.nullable(),
});
const receipt = z.object({
  merchant: z.string().max(100), date: z.union([date, z.literal('')]),
  currency: z.enum(['USD', 'EUR', 'GBP', '']), total: amount.nullable(),
  lines: z.array(line).min(1).max(50), source: z.enum(['sample', 'photo']), aiSignal: z.boolean(),
  corrected: z.boolean().optional(), lowConfidence: z.boolean().optional(), digest: id.optional(),
});
const interval = z.object({
  id, day: z.number().int().min(0).max(4), start: z.number().int().min(0).max(1439),
  end: z.number().int().min(1).max(1439), activity: z.enum(activities), project: z.enum(projects),
  confirmed: z.literal(true),
});
const revision = z.number().int().nonnegative();
const note = z.string().trim().max(500);
const decision = z.enum(['approved', 'returned', 'rejected']);
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('time.submit'), week, revision, rows: z.array(interval).min(1).max(80) }),
  z.object({ type: z.literal('time.review'), week, revision, decision, note, checked: z.boolean() }),
  z.object({ type: z.literal('expense.submit'), id, revision, receipt }),
  z.object({ type: z.literal('expense.review'), id, revision, decision, note, lineIndexes: z.array(z.number().int().nonnegative()).max(50) }),
]);
export type Command = z.infer<typeof commandSchema>;

export class WorkflowError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

function requireCondition(condition: unknown, message: string, status?: number): asserts condition {
  if (!condition) throw new WorkflowError(message, status);
}

export function projectOrder(project: Interval['project']) {
  return project === projects[0] ? 'WO-4821' : 'WO-4917';
}

export function timeExceptions(rows: Interval[], weekStart: string, demo: boolean) {
  const source = weekStart === exampleWeek && demo ? makeWeek() : [];
  const reassignments = rows.filter(row => source.some(original => original.id === row.id && original.project !== row.project)).length;
  return { overtime: reportableMinutes(rows) > 2400, reassignments };
}

export function spentFor(workspace: Workspace, month: string, demo: boolean) {
  const prior = demo && month === sampleMonth ? startingLedger[sampleMonth] : 0;
  return workspace.claims.reduce((sum, claim) => (
    ['reserved', 'approved'].includes(claim.state) && claim.receipt.date.slice(0, 7) === month ? sum + claim.amount : sum
  ), prior);
}

export function isReceiptMatch(keys: string[], claims: Claim[], prefix: string, except?: string) {
  return keys.some(key => key.startsWith(prefix) && claims.some(claim => claim.id !== except && claim.keys.includes(key)));
}

export function applyCommand(workspace: Workspace, command: Command, actor: Actor, now: string): Workspace {
  const review = command.type === 'time.review' || command.type === 'expense.review';
  requireCondition(review ? actor.canReview : actor.canSubmit, 'Your role cannot perform this action.', 403);
  if (command.type === 'time.submit' || command.type === 'time.review') {
    const previous = workspace.timesheets[command.week];
    requireCondition((previous?.revision ?? 0) === command.revision, 'This timesheet changed. Refresh and try again.');
    let next: TimeSheet;
    if (command.type === 'time.submit') {
      requireCondition(!previous || previous.state === 'returned' || previous.state === 'rejected', 'This timesheet is already submitted.');
      requireCondition(new Set(command.rows.map(row => row.id)).size === command.rows.length, 'Each interval must have its own ID.', 422);
      const sources = command.week === exampleWeek && actor.demo ? makeWeek() : [];
      const rows: Interval[] = command.rows.map(row => {
        const original = sources.find(entry => entry.id === row.id && entry.day === row.day);
        return {
          ...row, order: projectOrder(row.project), evidence: original?.evidence ?? [],
          edited: !original || row.start !== original.start || row.end !== original.end || row.activity !== original.activity || row.project !== original.project,
        };
      });
      const issues = validate(rows);
      requireCondition(!issues.length && reportableMinutes(rows) > 0, issues.join(' ') || 'Add reportable time before submitting.', 422);
      next = { rows, revision: command.revision + 1, state: 'submitted', note: '', updatedAt: now };
    } else {
      requireCondition(previous?.state === 'submitted', 'Only a submitted timesheet can be reviewed.');
      const { overtime, reassignments } = timeExceptions(previous.rows, command.week, actor.demo);
      requireCondition(command.decision === 'approved' ? command.checked || (!overtime && !reassignments) : command.note, 'Acknowledge the exceptions or provide a review note.', 422);
      next = { ...previous, revision: previous.revision + 1, state: command.decision, note: command.note, updatedAt: now };
    }
    return { ...workspace, timesheets: { ...workspace.timesheets, [command.week]: next } };
  }

  const previous = workspace.claims.find(claim => claim.id === command.id);
  requireCondition((previous?.revision ?? 0) === command.revision, 'This claim changed. Refresh and try again.');
  let next: Claim;
  if (command.type === 'expense.submit') {
    requireCondition(!previous || previous.state === 'returned', 'This claim is already submitted.');
    const receipt = command.receipt;
    const keys = [...new Set([...(previous?.keys ?? []), ...receiptKeys(receipt)])];
    requireCondition(keys.length, 'Attach a receipt or provide the purchase details.', 422);
    requireCondition(!isReceiptMatch(keys, workspace.claims, 'file:', command.id), 'This receipt was already submitted.');
    const used = spentFor(workspace, receipt.date.slice(0, 7), actor.demo);
    const outcome = assess(receipt, used, isReceiptMatch(keys, workspace.claims, 'transaction:', command.id));
    requireCondition(outcome.needsReview || outcome.eligible > 0, 'There are no eligible items to submit.', 422);
    // Browser OCR is employee-provided data in a shared workspace. A reviewer verifies the receipt before reserving money.
    const reserve = actor.demo && !outcome.needsReview;
    next = {
      id: command.id, receipt, keys, revision: command.revision + 1,
      state: reserve ? 'reserved' : 'review', amount: reserve ? outcome.eligible : 0,
      lineIndexes: reserve ? outcome.decisions.flatMap((item, index) => item.status === 'Eligible' ? [index] : []) : [],
      note: '', updatedAt: now,
    };
  } else {
    requireCondition(previous?.state === 'review', 'Only a claim awaiting review can be decided.');
    requireCondition(command.note, 'Record a review reason.', 422);
    const selected = [...new Set(command.lineIndexes)];
    let approvedAmount = 0;
    if (command.decision === 'approved') {
      const { receipt } = previous;
      requireCondition(receipt.currency === 'USD' && receipt.merchant.trim() && validDate(receipt.date) && receipt.total !== null,
        'A merchant, valid date, total and USD currency are required for approval.', 422);
      requireCondition(receipt.lines.every(item => item.cents !== null) &&
        receipt.lines.reduce((sum, item) => sum + (item.cents ?? 0), 0) === receipt.total,
      'The item amounts must reconcile to the receipt total.', 422);
      const used = spentFor(workspace, receipt.date.slice(0, 7), actor.demo);
      const check = assess(receipt, used);
      for (const index of selected) {
        const item = receipt.lines[index];
        requireCondition(item?.cents && item.quantity >= 1 && item.description.trim() && check.decisions[index]?.status !== 'Excluded',
          'Choose valid work items only.', 422);
        approvedAmount += item.cents;
      }
      requireCondition(approvedAmount > 0 && approvedAmount <= allowance - used, 'Approved items must fit within the remaining monthly limit.', 422);
    }
    next = {
      ...previous, revision: previous.revision + 1, state: command.decision, amount: approvedAmount,
      lineIndexes: command.decision === 'approved' ? selected : [], note: command.note, updatedAt: now,
    };
  }
  return { ...workspace, claims: [next, ...workspace.claims.filter(claim => claim.id !== next.id)] };
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCommand, browserActor, commandSchema, emptyWorkspace, exampleWeek, spentFor } from './pilot/model';
import type { Command } from './pilot/model';
import { makeWeek } from './workflow';
import { sampleMonth, sampleReceipt } from './expenses/policy';

const now = '2026-11-12T12:00:00Z';
const employee = { id: 'employee', canSubmit: true, canReview: false, demo: false };
const reviewer = { id: 'reviewer', canSubmit: false, canReview: true, demo: false };

test('timesheet stores a single revision and only reviewer can approve it', () => {
  const submit = commandSchema.parse({
    type: 'time.submit', week: exampleWeek, revision: 0,
    rows: makeWeek().slice(0, 1).map(row => ({ ...row, order: 'FORGED' })),
  });
  const submitted = applyCommand(emptyWorkspace, submit, employee, now);
  assert.equal(submitted.timesheets[exampleWeek].rows[0].order, 'WO-4821');
  assert.throws(() => applyCommand(submitted, submit, employee, now), /changed/);
  const review = { type: 'time.review', week: exampleWeek, revision: 1, decision: 'approved', note: '', checked: false } as const;
  assert.throws(() => applyCommand(submitted, review, employee, now), /role/);
  assert.equal(applyCommand(submitted, review, reviewer, now).timesheets[exampleWeek].state, 'approved');
});

test('only eligible lines reserve money and duplicate content or an over-cap claim cannot reserve again', () => {
  const make = (id: string, date: string, digest: string) => commandSchema.parse({
    type: 'expense.submit', id, revision: 0, receipt: { ...sampleReceipt, date, digest },
  });
  const workspace = applyCommand(emptyWorkspace, make('a', '2026-11-09', 'sample-a'), browserActor, now);
  assert.deepEqual(workspace.claims[0].lineIndexes, [0]);
  assert.equal(spentFor(workspace, sampleMonth, true), 41_900);
  assert.throws(() => applyCommand(workspace, make('b', '2026-11-11', 'sample-a'), browserActor, now), /already submitted/);
  const second = applyCommand(workspace, make('b', '2026-11-11', 'sample-b'), browserActor, now);
  assert.equal(second.claims[0].state, 'review');
  assert.equal(spentFor(second, sampleMonth, true), 41_900);
  const decision: Command = { type: 'expense.review', id: 'b', revision: 1, decision: 'approved', note: 'Confirmed.', lineIndexes: [0] };
  assert.throws(() => applyCommand(second, { ...decision, lineIndexes: [1] }, browserActor, now), /work items/);
  assert.throws(() => applyCommand(second, { ...decision, lineIndexes: [0] }, browserActor, now), /remaining/);
});

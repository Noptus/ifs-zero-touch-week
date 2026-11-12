import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaults, scenarios, size } from './capacity';
import { clock, makeWeek, minutes, monday, projects, reconstruct, sumMinutes, validate } from './workflow';

test('reconstructs the same intervals from reversed and duplicated evidence', () => {
  const baseline = reconstruct(monday, 0, projects[0]);
  const replay = reconstruct([...monday].reverse().concat(monday[2]), 0, projects[0]);
  assert.deepEqual(replay, baseline);
  assert.equal(replay.length, 6);
  assert.equal(replay[3].activity, 'Gap');
  assert.equal(replay[3].confirmed, false);
  assert.deepEqual(replay[3].evidence.map(event => event.id), ['e4', 'e5']);
});

test('does not create a duration from the last unbounded signal', () => {
  assert.deepEqual(reconstruct([monday[0]], 0, projects[0]), []);
  assert.equal(reconstruct(monday.slice(0, -1), 0, projects[0]).at(-1)?.end, 960);
});

test('submission validates ambiguity, overlap and invalid time', () => {
  const rows = makeWeek();
  const resolved = rows.map(row => row.activity === 'Gap' ? { ...row, activity: 'Break' as const, confirmed: true } : row);
  assert.match(validate(rows).join(' '), /unresolved/);
  assert.deepEqual(validate(resolved), []);
  assert.equal(sumMinutes(resolved.filter(row => row.activity !== 'Break')), 2430);
  assert.match(validate([{ ...resolved[0], end: 560 }, ...resolved.slice(1)]).join(' '), /overlapping/);
  assert.match(validate([{ ...resolved[0], start: NaN }, ...resolved.slice(1)]).join(' '), /valid start/);
});

test('handles boundary times without accepting malformed input', () => {
  assert.equal(minutes('00:00'), 0);
  assert.equal(clock(minutes('23:59')), '23:59');
  assert.ok(Number.isNaN(minutes('24:00')));
  assert.ok(Number.isNaN(minutes('12:60')));
  assert.equal(clock(NaN), '');
});

test('pilot sizing reconciles decimal units, ceilings and cost', () => {
  const result = size(defaults);
  assert.equal(result.frames, 144000);
  assert.equal(result.rawGB, 12.96);
  assert.equal(result.siteMbps, 2.88);
  assert.equal(result.events, 240);
  assert.equal(result.edgeCPU.workers, 1);
  assert.equal(result.edgeCPU.effectiveFPS, 8.399999999999999);
  assert.equal(result.cloudGPU?.workers, 1);
  assert.ok(Math.abs((result.cloudGPU?.runtime ?? 0) - 144000 / (120 * .7 * 3600)) < 1e-9);
  assert.ok(Math.abs(result.edgeCPU.cost - (65 + 36 + 30 * .00024 * .04 + .00168 * .025)) < 1e-9);
});

test('camera-free baseline and zero active hours keep only shared cost', () => {
  for (const input of [scenarios['Camera-free'], { ...defaults, hours: 0 }]) {
    const result = size(input);
    assert.equal(result.frames, 0);
    assert.equal(result.siteMbps, 0);
    assert.equal(result.cloudGPU?.workers, 0);
    assert.equal(result.edgeCPU.cost, defaults.basePrice);
    assert.equal(result.cloudCPU?.cost, defaults.basePrice);
  }
});

test('includes warm-up and idle floor, and flags an exhausted compute window', () => {
  const floor = size({ ...defaults, billingFloor: 8 });
  assert.equal(floor.cloudGPU?.billed, 8);
  const impossible = size({ ...defaults, window: .1 });
  assert.equal(impossible.cloudGPU, null);
  assert.equal(impossible.cloudCPU, null);
  assert.equal(impossible.edgeCPU.workers, 1);
});

test('sample rate scales frame payload while capture chance has a ceiling', () => {
  const slow = size({ ...defaults, fps: .5, framePct: 1 });
  const fast = size({ ...defaults, fps: 5, framePct: 1 });
  assert.equal(fast.frames, slow.frames * 10);
  assert.equal(slow.sampleChance, .3);
  assert.equal(fast.sampleChance, 1);
  assert.ok(fast.cloudRetention > fast.edgeRetention);
});

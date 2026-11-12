import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assess, flaggedReceipt, receiptKeys, sampleReceipt, validDate } from './expenses/policy';
import { hasAiSourceMarker, parseMoney, parseReceiptText } from './expenses/receiptText';

test('reimburses the drill only, with the exact monthly balance threshold', () => {
  const mixed = assess(sampleReceipt, 32_000);
  assert.deepEqual(mixed.decisions.map(line => line.status), ['Eligible', 'Excluded']);
  assert.equal(mixed.eligible, 8_990);
  assert.equal(mixed.remaining, 18_000);
  assert.equal(mixed.needsReview, false);
  assert.equal(assess(sampleReceipt, 41_010).needsReview, false);
  assert.match(assess(sampleReceipt, 41_011).issues.join(' '), /allowance/);
});

test('routes price, provenance, mismatch, currency and corrected evidence to review', () => {
  const flagged = assess(flaggedReceipt, 32_000);
  assert.equal(flagged.decisions[0].status, 'Review');
  assert.match(flagged.decisions[0].reason, /Outside/);
  assert.match(flagged.issues.join(' '), /AI-generation.*allowance/);
  assert.equal(assess({ ...sampleReceipt, total: 10_000 }, 0).needsReview, true);
  assert.equal(assess({ ...sampleReceipt, corrected: true }, 0).needsReview, true);
  assert.equal(assess({ ...sampleReceipt, currency: 'USD' }, 0).eligible, 0);
});

test('parses Euro receipt text and preserves quantity, minor units and transaction identity', () => {
  const receipt = parseReceiptText('OUTIL SHOP\n09/11/2026 EUR\n2 x Perceuse sans fil 179,80\nChocolat 2,40\nTOTAL TTC 182,20', 95, false, 'digest');
  assert.equal(receipt.date, '2026-11-09');
  assert.equal(receipt.currency, 'EUR');
  assert.equal(receipt.total, 18_220);
  assert.deepEqual(receipt.lines[0], { description: 'Perceuse sans fil', quantity: 2, cents: 17_980 });
  assert.equal(assess(receipt, 32_000).eligible, 17_980);
  assert.equal(receiptKeys(receipt)[0], 'file:digest');
  assert.equal(parseMoney('1.234,50'), 123_450);
  assert.equal(parseMoney('12,5'), 1_250);
  assert.equal(parseMoney('4.99.50'), null);
  assert.equal(validDate('2026-02-30'), false);
});

test('detects the explicit fixture marker and leaves unmarked photos unverified', () => {
  for (const [filename, expected] of [['hardware-shop.png', false], ['flagged-shop.png', true]] as const) {
    const image = readFileSync(new URL(`../public/receipts/${filename}`, import.meta.url));
    const buffer = image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength) as ArrayBuffer;
    assert.equal(hasAiSourceMarker(buffer), expected);
  }
});

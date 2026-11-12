import { validDate } from './policy';
import type { Line, Receipt } from './policy';

export function parseMoney(value: string) {
  const clean = value.trim().replace(/\s*(?:EUR|USD|GBP|€|\$|£)\s*/gi, '').trim();
  const decimal = /[.,](\d{1,2})$/.exec(clean);
  const integer = decimal ? clean.slice(0, decimal.index) : clean;
  if (!/^\d+$|^\d{1,3}(?:[., \u00a0\u202f]\d{3})+$/.test(integer)) return null;
  const cents = Number(integer.replace(/\D/g, '')) * 100 + Number(decimal?.[1].padEnd(2, '0') ?? 0);
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null;
}

function findDate(text: string, currency = '') {
  const iso = text.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (iso && validDate(iso)) return iso;
  const local = text.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
  if (!local) return '';
  const first = Number(local[1]), second = Number(local[2]);
  if (first <= 12 && second <= 12 && first !== second && !currency) return '';
  const monthFirst = second > 12 || (first <= 12 && second <= 12 && currency === 'USD');
  const date = `${local[3]}-${local[monthFirst ? 1 : 2].padStart(2, '0')}-${local[monthFirst ? 2 : 1].padStart(2, '0')}`;
  return validDate(date) ? date : '';
}

const genericTitle = /^(?:(?:sales\s+)?receipt|reçu(?:\s+de\s+vente)?|ticket\s+de\s+caisse)[\s.:=|–-]*$/i;
const ignoredLabels = /^(?:sub[\s-]*total|sous[\s-]*total|total|tax|vat|tva|change|cash|carte|card|payment|tendered|discount|remise|date|receipt|ticket)\b|\b(?:tendered total|amount tendered)\b/i;
const trailingAmount = /\s+((?:[€$£]\s*)?\d[\d.,]*(?:[.,]\d{2})(?:\s?(?:EUR|USD|GBP|[€$£]))?)$/i;
const amountWithMarginNoise = /[ \t]{2,}([€$£]\s*\d[\d.,]*[.,]\d{2})(?:[ \t]{2,}[^\d€$£]{1,3}|[ \t]+[^\p{L}\p{N}\s€$£]{1,3})$/u;

export function parseReceiptText(text: string, confidence: number, aiSignal: boolean, digest: string): Receipt {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const titleIndex = lines.slice(0, 6).findIndex(line => genericTitle.test(line));
  const candidates = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines;
  const merchantLabel = /^(?:merchant|store|magasin|commerçant)\s*:\s*(.+)$/i;
  const merchantCandidate = titleIndex >= 0
    ? lines.slice(0, titleIndex + 2).map(line => merchantLabel.exec(line)?.[1]).find(Boolean)
      ?? (titleIndex === 1 && confidence >= 75 ? lines[0] : undefined)
    : candidates[0];
  const merchant = merchantCandidate && /\p{L}/u.test(merchantCandidate)
    && !/^(?:receipt|reçu|demo|sample|qty|quantity|date|total)\b/i.test(merchantCandidate)
    && !trailingAmount.test(merchantCandidate) && !findDate(merchantCandidate)
    ? merchantCandidate.slice(0, 100) : '';
  const currencies = [
    /\bEUR\b|€/i.test(text) ? 'EUR' : '',
    /\bUSD\b|US\$/i.test(text) ? 'USD' : '',
    /\bGBP\b|£/i.test(text) ? 'GBP' : '',
  ].filter(Boolean);
  const currency = currencies.length === 1 ? currencies[0] : '';
  const items: Line[] = [];
  let total: number | null = null;

  for (const line of candidates.slice(titleIndex < 0 && merchant ? 1 : 0)) {
    const amount = trailingAmount.exec(line) ?? amountWithMarginNoise.exec(line);
    if (!amount) continue;
    const label = line.slice(0, amount.index).replace(/^[|:;.,\s]+|[:\s]+$/g, '');
    const cents = parseMoney(amount[1]);
    if (cents === null) continue;
    if (/^(?:(?:grand )?total(?:\s+ttc)?|amount due|à payer)$/i.test(label)) {
      total = cents;
      continue;
    }
    if (ignoredLabels.test(label) || !/\p{L}/u.test(label)) continue;
    const quantity = /^(\d+)\s*[x×]\s*/i.exec(label);
    items.push({ description: label.slice(quantity?.[0].length ?? 0, 100), quantity: Number(quantity?.[1] ?? 1), cents });
  }

  return { merchant, date: findDate(text, currency), currency, total, lines: items.slice(0, 50), source: 'photo', aiSignal, lowConfidence: confidence < 75 || items.length > 50, digest };
}

const aiTypes = ['trainedAlgorithmicMedia', 'compositeWithTrainedAlgorithmicMedia'];
const utf8 = new TextDecoder();
const aiXmp = /(?:[\w.-]+:)?DigitalSourceType(?:\s*=\s*["']|\s*>|[^>]*>\s*<rdf:Description[^>]*rdf:resource\s*=\s*["'])\s*(?:https?:\/\/cv\.iptc\.org\/newscodes\/digitalsourcetype\/)?(?:trainedAlgorithmicMedia|compositeWithTrainedAlgorithmicMedia)(?=["'\s<])/;

export function hasAiSourceMarker(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes.length >= 8 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a) {
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = view.getUint32(offset);
      if (length > bytes.length - offset - 12) break;
      const kind = utf8.decode(bytes.subarray(offset + 4, offset + 8));
      if (kind === 'IEND') break;
      if ((kind === 'tEXt' || kind === 'iTXt') && length <= 65_536) {
        const value = utf8.decode(bytes.subarray(offset + 8, offset + 8 + length));
        const [key, text] = value.split('\0');
        if (key === 'DigitalSourceType' && text && aiTypes.includes(text.trim().split('/').at(-1) ?? '')) return true;
        if (aiXmp.test(value)) return true;
      }
      offset += length + 12;
    }
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 4 <= bytes.length && bytes[offset] === 0xff;) {
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + length + 2 > bytes.length) break;
      if (marker === 0xe1) {
        const value = utf8.decode(bytes.subarray(offset + 4, offset + length + 2));
        if (value.startsWith('http://ns.adobe.com/xap/1.0/\0') && aiXmp.test(value)) return true;
      }
      offset += length + 2;
    }
  }
  return false;
}

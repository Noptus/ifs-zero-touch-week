import { createWorker, OEM } from 'tesseract.js';
import { hasAiSourceMarker, parseReceiptText } from './receiptText';

export async function scanReceipt(file: File, progress: (value: number) => void) {
  const bytes = await file.arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  const asset = new URL(`${import.meta.env.BASE_URL}ocr/`, window.location.origin);
  const worker = await createWorker(['eng', 'fra'], OEM.LSTM_ONLY, {
    workerPath: new URL('worker.min.js', asset).href,
    corePath: new URL('core-lstm.wasm.js', asset).href,
    langPath: asset.href,
    workerBlobURL: false,
    logger: message => {
      if (message.status === 'recognizing text') progress(Math.round(message.progress * 100));
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return parseReceiptText(data.text, data.confidence, hasAiSourceMarker(bytes), digest);
  } finally {
    await worker.terminate();
  }
}

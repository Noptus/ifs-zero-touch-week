import { createWorker, OEM } from 'tesseract.js';
import { hasAiSourceMarker, parseReceiptText } from './receiptText';

async function prepareScanImage(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(Math.min(bitmap.width, bitmap.height) < 600 ? 3 : 1, 2400 / longestEdge);
    if (scale === 1) return file;

    const border = 12;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width + border * 2;
    canvas.height = height + border * 2;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, border, border, width, height);
    return await new Promise<Blob | File>(resolve => canvas.toBlob(blob => resolve(blob ?? file), 'image/png'));
  } finally {
    bitmap.close();
  }
}

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
    const image = await prepareScanImage(file).catch(() => file);
    await worker.setParameters({ preserve_interword_spaces: '1' });
    const { data } = await worker.recognize(image);
    return parseReceiptText(data.text, data.confidence, hasAiSourceMarker(bytes), digest);
  } finally {
    await worker.terminate();
  }
}

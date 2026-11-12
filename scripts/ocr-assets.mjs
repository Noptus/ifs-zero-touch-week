import { copyFile, mkdir } from 'node:fs/promises';

const output = new URL('../public/ocr/', import.meta.url);
const dependencies = new URL('../node_modules/', import.meta.url);
const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'core-lstm.wasm.js'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
  ['@tesseract.js-data/fra/4.0.0_best_int/fra.traineddata.gz', 'fra.traineddata.gz'],
  ['tesseract.js/LICENSE.md', 'tesseract-js-license.txt'],
  ['tesseract.js-core/LICENSE', 'tesseract-core-license.txt'],
];
await mkdir(output, { recursive: true });
await Promise.all(files.map(([source, target]) => copyFile(new URL(source, dependencies), new URL(target, output))));

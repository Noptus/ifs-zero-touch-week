import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { hasAiSourceMarker } from '../src/expenses/receiptText';
import { browserActor, commandSchema, WorkflowError } from '../src/pilot/model';
import type { Actor } from '../src/pilot/model';
import { storage } from './storage';
import { analyze, publicFrame, visionEnabled } from './vision';

const local = process.env.PILOT_AUTH === 'local';
if (!local && (!process.env.PILOT_EMPLOYEE_OBJECT_ID || !process.env.PILOT_REVIEWER_OBJECT_ID || !process.env.PILOT_TENANT_ID || process.env.PILOT_EMPLOYEE_OBJECT_ID === process.env.PILOT_REVIEWER_OBJECT_ID)) {
  throw new Error('Configure a tenant and two distinct, authorized Entra object IDs.');
}
const data = await storage();
const root = resolve('dist');
const base = '/ifs-zero-touch-week/';
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };

function actor(req: IncomingMessage): Actor {
  if (local) return { ...browserActor, demo: process.env.PILOT_SEED_DEMO === '1' };
  try {
    const principal = JSON.parse(Buffer.from(String(req.headers['x-ms-client-principal'] ?? ''), 'base64').toString());
    const claim = (...types: string[]) => principal.claims.find((item: { typ: string }) => types.includes(item.typ))?.val;
    const id = claim('oid', 'http://schemas.microsoft.com/identity/claims/objectidentifier');
    if (principal.auth_typ !== 'aad' || claim('tid', 'http://schemas.microsoft.com/identity/claims/tenantid') !== process.env.PILOT_TENANT_ID) throw new Error();
    const canSubmit = id === process.env.PILOT_EMPLOYEE_OBJECT_ID;
    const canReview = id === process.env.PILOT_REVIEWER_OBJECT_ID;
    if (canSubmit || canReview) return { id, canSubmit, canReview, demo: false };
  } catch { /* App Service authenticates and strips spoofed principal headers before forwarding. */ }
  throw new WorkflowError('This account is not assigned to the pilot.', 403);
}

async function body(req: IncomingMessage, max: number) {
  const origin = req.headers.origin;
  const proto = local ? 'http' : 'https';
  if (origin && origin !== `${proto}://${req.headers.host}`) throw new WorkflowError('Cross-site requests are not accepted.', 403);
  if (!req.headers['content-type']?.startsWith('application/json')) throw new WorkflowError('Send JSON.', 415);
  const parts: Buffer[] = [];
  let size = 0;
  for await (const part of req.iterator({ destroyOnReturn: false })) {
    size += part.length;
    if (size > max) { req.resume(); throw new WorkflowError('The request is too large.', 413); }
    parts.push(part);
  }
  try { return JSON.parse(Buffer.concat(parts).toString()); }
  catch { throw new WorkflowError('The request contains invalid JSON.', 400); }
}

function json(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}

const app = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (local && !/^(?:127\.0\.0\.1|localhost)(?::[0-9]+)?$/.test(req.headers.host ?? '')) throw new WorkflowError('The local pilot requires a loopback host.', 403);
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (req.method === 'GET' && path === '/healthz') return json(res, { ok: true });
    if (req.method === 'GET' && path === '/') { res.writeHead(302, { Location: base }); return res.end(); }
    if (!path.startsWith(base)) throw new WorkflowError('Not found.', 404);
    const route = path.slice(base.length);
    if (route.startsWith('api/')) {
      const currentActor = actor(req);
      if (route === 'api/workspace' && req.method === 'GET') return json(res, { actor: currentActor, workspace: await data.read() });
      if (route === 'api/workspace' && req.method === 'POST') {
        const input = await body(req, 17 * 1024 * 1024);
        const parsed = commandSchema.safeParse(input?.command);
        if (!parsed.success) throw new WorkflowError(parsed.error.issues[0]?.message ?? 'Invalid workflow request.', 422);
        const command = parsed.data;
        let photo: { digest: string; mime: string; bytes: Buffer } | undefined;
        if (command.type === 'expense.submit' && command.receipt.source === 'photo') {
          if (!currentActor.canSubmit) throw new WorkflowError('Your role cannot perform this action.', 403);
          const digest = command.receipt.digest;
          if (!digest || !/^[0-9a-f]{64}$/.test(digest)) throw new WorkflowError('Attach the original receipt photo.', 422);
          if (input.photo !== undefined) {
            const match = typeof input.photo === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/]+=*)$/i.exec(input.photo);
            if (!match) throw new WorkflowError('Use a JPEG, PNG or WebP receipt.', 422);
            const bytes = Buffer.from(match[2], 'base64');
            const validType = match[1] === 'image/jpeg' ? bytes.subarray(0, 3).toString('hex') === 'ffd8ff' :
              match[1] === 'image/png' ? bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' :
              bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
            if (!validType || bytes.length > 12 * 1024 * 1024 || createHash('sha256').update(bytes).digest('hex') !== digest) throw new WorkflowError('The receipt photo does not match the claim.', 422);
            photo = { digest, bytes, mime: match[1] };
          }
          const evidence = photo ?? await data.photo(digest);
          if (!evidence) throw new WorkflowError('Attach the original receipt photo.', 422);
          command.receipt.aiSignal = hasAiSourceMarker(Uint8Array.from(evidence.bytes).buffer);
        } else if (command.type === 'expense.submit' && !currentActor.demo) {
          throw new WorkflowError('Sample receipts are available only in the demo.', 422);
        }
        return json(res, { actor: currentActor, workspace: await data.change(currentActor, command, photo) });
      }
      if (route.startsWith('api/receipt/') && req.method === 'GET') {
        const digest = route.slice('api/receipt/'.length);
        const image = /^[0-9a-f]{64}$/.test(digest) ? await data.photo(digest) : undefined;
        if (!image) throw new WorkflowError('Receipt photo not found.', 404);
        res.writeHead(200, { 'Content-Type': image.mime, 'Cache-Control': 'no-store' });
        return res.end(image.bytes);
      }
      if (route === 'api/vision' && req.method === 'GET') return json(res, { enabled: visionEnabled });
      if (route === 'api/vision' && req.method === 'POST') {
        const input = await body(req, 1_050_000);
        return json(res, await analyze(input?.source, input?.frame));
      }
      if (route === 'api/camera' && req.method === 'GET') {
        const frame = await publicFrame();
        res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' });
        return res.end(frame.bytes);
      }
      throw new WorkflowError('Not found.', 404);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new WorkflowError('Method not allowed.', 405);
    if (!local) actor(req);
    const filename = resolve(root, route.endsWith('/') || !route ? route + 'index.html' : route);
    if (!filename.startsWith(root + sep)) throw new WorkflowError('Not found.', 404);
    const file = await stat(filename).catch(() => undefined);
    if (!file?.isFile()) throw new WorkflowError('Not found.', 404);
    res.writeHead(200, { 'Content-Type': mime[extname(filename)] ?? 'application/octet-stream', 'Content-Length': file.size });
    if (req.method === 'HEAD') return res.end();
    createReadStream(filename).on('error', () => res.destroy()).pipe(res);
  } catch (err) {
    if (err instanceof WorkflowError) return json(res, { error: err.message }, err.status);
    console.error('Request failed', err instanceof Error ? err.name : 'Unknown');
    return json(res, { error: 'The service could not complete this request.' }, 500);
  }
});
app.listen(Number(process.env.PORT ?? 8788), local ? '127.0.0.1' : '0.0.0.0', () => console.log('Zero-Touch Week pilot listening.'));

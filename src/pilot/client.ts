import { useEffect, useState } from 'react';
import { applyCommand, browserActor, commandSchema, emptyWorkspace } from './model';
import type { Command, Snapshot, Workspace } from './model';

export const serverMode = import.meta.env.VITE_PILOT_MODE === 'server';
const api = `${import.meta.env.BASE_URL}api/`;
export const initial: Snapshot = { workspace: emptyWorkspace, actor: serverMode ? { id: '', canSubmit: false, canReview: false, demo: false } : browserActor };

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('zero-touch-week', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('workspace');
      req.result.createObjectStore('receipts');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function browserSnapshot(command?: Command, image?: Blob): Promise<Snapshot> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['workspace', 'receipts'], command ? 'readwrite' : 'readonly');
      const store = tx.objectStore('workspace');
      const req = store.get('current');
      let workspace: Workspace;
      let error: unknown;
      req.onsuccess = () => {
        try {
          workspace = req.result ?? emptyWorkspace;
          if (!command) return;
          workspace = applyCommand(workspace, commandSchema.parse(command), browserActor, new Date().toISOString());
          store.put(workspace, 'current');
          if (command.type === 'expense.submit' && command.receipt.digest && image) tx.objectStore('receipts').put(image, command.receipt.digest);
        } catch (err) {
          error = err;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve({ workspace, actor: browserActor });
      tx.onabort = () => reject(error ?? tx.error);
    });
  } finally { db.close(); }
}

function asDataUrl(image: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(image);
  });
}

async function snapshot(command?: Command, image?: Blob): Promise<Snapshot> {
  if (!serverMode) return browserSnapshot(command, image);
  const res = await fetch(`${api}workspace`, command ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, photo: image ? await asDataUrl(image) : undefined }),
  } : undefined);
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Workspace request failed (${res.status}).`);
  return res.json();
}

export async function receiptPhoto(digest: string) {
  if (serverMode) {
    const res = await fetch(`${api}receipt/${encodeURIComponent(digest)}`);
    return res.ok ? res.blob() : null;
  }
  const db = await database();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const req = db.transaction('receipts').objectStore('receipts').get(digest);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}

export function usePilot() {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    snapshot().then(value => { if (active) setData(value); })
      .catch(err => { if (active) setError(String(err.message)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  async function run(command?: Command, image?: Blob) {
    setBusy(true);
    setError('');
    try {
      const next = await snapshot(command, image);
      setData(next);
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
      return null;
    } finally { setBusy(false); }
  }
  return { ...data, busy, error, run };
}

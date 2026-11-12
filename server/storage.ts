import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import { applyCommand, emptyWorkspace } from '../src/pilot/model';
import type { Actor, Command, Workspace } from '../src/pilot/model';

type Photo = { digest: string; mime: string; bytes: Buffer };
type Store = {
  read: () => Promise<Workspace>;
  photo: (digest: string) => Promise<Photo | undefined>;
  change: (actor: Actor, command: Command, photo?: Photo) => Promise<Workspace>;
};
const rows = [
  'CREATE TABLE IF NOT EXISTS workspace (id integer PRIMARY KEY, data TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS receipt_photo (digest TEXT PRIMARY KEY, mime TEXT NOT NULL, bytes BYTEA NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audit (at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, record_id TEXT NOT NULL, revision INTEGER NOT NULL)',
];
const initial = JSON.stringify(emptyWorkspace);
const recordId = (command: Command) => 'week' in command ? command.week : command.id;

export async function storage(): Promise<Store> {
  if (process.env.DATABASE_URL || process.env.PGHOST) {
    const db = new Pool({ max: 5, ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}), ...(process.env.PG_TLS === '1' ? { ssl: { rejectUnauthorized: true } } : {}) });
    for (const sql of rows) await db.query(sql);
    await db.query('INSERT INTO workspace VALUES (1,$1) ON CONFLICT DO NOTHING', [initial]);
    return {
      async read() { return JSON.parse((await db.query('SELECT data FROM workspace WHERE id=1')).rows[0].data); },
      async photo(digest) { return (await db.query('SELECT * FROM receipt_photo WHERE digest=$1', [digest])).rows[0]; },
      async change(actor, command, photo) {
        const client = await db.connect();
        try {
          await client.query('BEGIN');
          const current = JSON.parse((await client.query('SELECT data FROM workspace WHERE id=1 FOR UPDATE')).rows[0].data);
          const now = new Date().toISOString();
          const next = applyCommand(current, command, actor, now);
          await client.query('UPDATE workspace SET data=$1 WHERE id=1', [JSON.stringify(next)]);
          if (photo) await client.query('INSERT INTO receipt_photo VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [photo.digest, photo.mime, photo.bytes]);
          await client.query('INSERT INTO audit VALUES ($1,$2,$3,$4,$5)', [now, actor.id, command.type, recordId(command), command.revision + 1]);
          await client.query('COMMIT');
          return next;
        } catch (err) { await client.query('ROLLBACK'); throw err; }
        finally { client.release(); }
      },
    };
  }
  if (process.env.PILOT_AUTH !== 'local') throw new Error('A PostgreSQL database is required outside the local demo.');
  const db = new DatabaseSync(process.env.PILOT_DB ?? 'zero-touch-local.sqlite');
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  for (const sql of rows) db.exec(sql);
  db.prepare('INSERT OR IGNORE INTO workspace VALUES (1,?)').run(initial);
  const read = () => JSON.parse(String(db.prepare('SELECT data FROM workspace WHERE id=1').get()?.data)) as Workspace;
  return {
    async read() { return read(); },
    async photo(digest) {
      const row = db.prepare('SELECT * FROM receipt_photo WHERE digest=?').get(digest);
      return row ? { digest, mime: String(row.mime), bytes: Buffer.from(row.bytes as Uint8Array) } : undefined;
    },
    async change(actor, command, photo) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const now = new Date().toISOString();
        const next = applyCommand(read(), command, actor, now);
        db.prepare('UPDATE workspace SET data=? WHERE id=1').run(JSON.stringify(next));
        if (photo) db.prepare('INSERT OR IGNORE INTO receipt_photo VALUES (?,?,?)').run(photo.digest, photo.mime, photo.bytes);
        db.prepare('INSERT INTO audit VALUES (?,?,?,?,?)').run(now, actor.id, command.type, recordId(command), command.revision + 1);
        db.exec('COMMIT');
        return next;
      } catch (err) { db.exec('ROLLBACK'); throw err; }
    },
  };
}

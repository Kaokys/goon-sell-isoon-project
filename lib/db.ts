import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { schema } from './schema';

export type Row = Record<string, any>;
export interface DB { query<T extends Row = Row>(sql: string, params?: any[]): Promise<T[]>; transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>; }
const state = globalThis as unknown as { artDB?: Promise<DB> };

const blobTables = ['users','sessions','categories','media','artworks','orders','order_items','audit_logs','rate_limits','addresses'] as const;
type BlobStore = { version: number; savedAt: string; tables: Record<string, Row[]> };

function jsonValue(value: any): any {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) return { __base64: Buffer.from(value).toString('base64') };
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,jsonValue(item)]));
  return value;
}

function fromJsonValue(value: any): any {
  if (value && typeof value === 'object' && typeof value.__base64 === 'string') return Buffer.from(value.__base64,'base64');
  return value;
}

async function blobAdapter(): Promise<DB> {
  const { get, put } = await import('@vercel/blob');
  const { PGlite } = await import('@electric-sql/pglite');
  const pathname = 'sillapa/coursework-data.json';
  const pg = new PGlite('memory://');
  await pg.waitReady;
  await pg.exec(schema);

  const stored = await get(pathname,{access:'private',useCache:false});
  if (stored?.stream) {
    const parsed = JSON.parse(await new Response(stored.stream as any).text()) as BlobStore;
    await pg.transaction(async tx => {
      for (const table of blobTables) {
        for (const row of parsed.tables?.[table] || []) {
          const columns = Object.keys(row);
          if (!columns.length) continue;
          const values = columns.map(column => {
            const value = fromJsonValue(row[column]);
            return table === 'audit_logs' && column === 'details' ? JSON.stringify(value) : value;
          });
          const names = columns.map(column => `"${column}"`).join(',');
          const placeholders = columns.map((_,index) => `$${index+1}`).join(',');
          await tx.query(`INSERT INTO art.${table}(${names}) VALUES(${placeholders})`,values);
        }
      }
      await tx.exec("SELECT setval(pg_get_serial_sequence('art.audit_logs','id'), COALESCE(MAX(id),1), MAX(id) IS NOT NULL) FROM art.audit_logs");
    });
  }

  let saving = Promise.resolve();
  const persist = async () => {
    const tables: Record<string,Row[]> = {};
    for (const table of blobTables) tables[table] = jsonValue((await pg.query(`SELECT * FROM art.${table}`)).rows);
    const content = JSON.stringify({version:1,savedAt:new Date().toISOString(),tables} satisfies BlobStore);
    saving = saving.then(async () => { await put(pathname,content,{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true}); });
    await saving;
  };

  const raw = (client: any, saveAfter: boolean): DB => ({
    query: async (text, params = []) => {
      const result = (await client.query(text,params)).rows;
      if (saveAfter && /^\s*(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(text)) await persist();
      return result;
    },
    transaction: async fn => {
      const result = await client.transaction((tx: any) => fn(raw(tx,false)));
      if (saveAfter) await persist();
      return result;
    },
  });
  const db = raw(pg,true);
  if (!stored) {
    const { seedLocal } = await import('./seed');
    await seedLocal(raw(pg,false));
  }
  const { syncSampleArt } = await import('./seed');
  await syncSampleArt(raw(pg,false));
  await persist();
  return db;
}

export async function getDB(): Promise<DB> {
  if (!state.artDB) state.artDB = (async () => {
    if (process.env.BLOB_READ_WRITE_TOKEN) return blobAdapter();
    if (process.env.VERCEL) throw new Error('BLOB_READ_WRITE_TOKEN is required on Vercel. Connect a private Vercel Blob store, then redeploy.');
    const { PGlite } = await import('@electric-sql/pglite');
    const dataDir = process.env.LOCAL_DB_PATH || path.join(process.cwd(), '.data', 'postgres');
    await mkdir(dataDir, {recursive:true});
    const pg = new PGlite(dataDir);
    await pg.waitReady;
    const adapter = (client: any): DB => ({
      query: async (text, params = []) => (await client.query(text, params)).rows,
      transaction: async fn => client.transaction((tx: any) => fn(adapter(tx)))
    });
    await pg.exec(schema);
    const db = adapter(pg);
    const { seedLocal, syncSampleArt } = await import('./seed');
    await seedLocal(db);
    await syncSampleArt(db);
    return db;
  })().catch(error => { state.artDB = undefined; throw error; });
  return state.artDB;
}
export async function audit(db: DB, actor: string, action: string, entity: string, id: string, details: Row = {}) {
  await db.query('INSERT INTO art.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)', [actor,action,entity,id,JSON.stringify(details)]);
}

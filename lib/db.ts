import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { schema } from './schema';

export type Row = Record<string, any>;
export interface DB { refresh?: () => Promise<void>; query<T extends Row = Row>(sql: string, params?: any[]): Promise<T[]>; transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>; }
const requestScope = new AsyncLocalStorage<Set<DB>>();
export const withDBRequest = <T>(fn: () => Promise<T>) => requestScope.run(new Set<DB>(),fn);
const state = globalThis as unknown as { artDB?: Promise<DB> };

async function blobAdapter(): Promise<DB> {
  const { get, put, BlobPreconditionFailedError } = await import('@vercel/blob');
  const { createSnapshotDB, SnapshotConflictError } = await import('./blob-store-db');
  const pathname='sillapa/coursework-data.json';
  return createSnapshotDB({
    read:async etag=>{
      const stored=await get(pathname,{access:'private',useCache:false,...(etag?{ifNoneMatch:etag}:{})});
      if(!stored)return null;
      const currentETag=stored.blob.etag||etag;
      if(!currentETag)throw new Error('Database response is missing its version');
      return {etag:currentETag,...(stored.stream?{snapshot:JSON.parse(await new Response(stored.stream as any).text())}:{})};
    },
    write:async(snapshot,etag)=>{
      try {const saved=await put(pathname,JSON.stringify(snapshot),{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:!!etag,...(etag?{ifMatch:etag}:{})});return saved.etag;}
      catch(error){if(error instanceof BlobPreconditionFailedError||error instanceof Error&&/already exists/i.test(error.message))throw new SnapshotConflictError('Database changed during save');throw error;}
    }
  });
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
    const { seedLocal, syncSampleArt, simplifyCategories } = await import('./seed');
    await seedLocal(db);
    await simplifyCategories(db);
    await syncSampleArt(db);
    return db;
  })().catch(error => { state.artDB = undefined; throw error; });
  const db=await state.artDB;const seen=requestScope.getStore();
  if(db.refresh&&!seen?.has(db)){await db.refresh();seen?.add(db);}
  return db;
}
export async function audit(db: DB, actor: string, action: string, entity: string, id: string, details: Row = {}) {
  await db.query('INSERT INTO art.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)', [actor,action,entity,id,JSON.stringify(details)]);
}

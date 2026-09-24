import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { schema } from './schema';

export type Row = Record<string, any>;
export interface DB { query<T extends Row = Row>(sql: string, params?: any[]): Promise<T[]>; transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>; }
const state = globalThis as unknown as { artDB?: Promise<DB> };
function remoteAdapter(sql: any): DB { return {
  query: async (text, params = []) => Array.from(await sql.unsafe(text, params)) as any,
  transaction: async fn => sql.begin((tx: any) => fn(remoteAdapter(tx)))
}; }
export async function getDB(): Promise<DB> {
  if (!state.artDB) state.artDB = (async () => {
    if (process.env.DATABASE_URL) {
      return remoteAdapter(postgres(process.env.DATABASE_URL, {prepare:false, max:3, idle_timeout:20, connect_timeout:15, ssl:'require'}));
    }
    if (process.env.VERCEL) throw new Error('DATABASE_URL is required on Vercel. Run db:setup before deployment.');
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
    const { seedLocal } = await import('./seed');
    await seedLocal(db);
    return db;
  })().catch(error => { state.artDB = undefined; throw error; });
  return state.artDB;
}
export async function audit(db: DB, actor: string, action: string, entity: string, id: string, details: Row = {}) {
  await db.query('INSERT INTO art.audit_logs(actor_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)', [actor,action,entity,id,JSON.stringify(details)]);
}

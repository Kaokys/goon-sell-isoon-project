import { PGlite } from '@electric-sql/pglite';
import { schema } from './schema';
import type { DB, Row } from './db';
import { seedLocal, simplifyCategories } from './seed';
export const snapshotTables=['users','sessions','categories','media','artworks','orders','order_items','audit_logs','rate_limits','addresses','site_settings'] as const;
export type Snapshot={version:number;savedAt:string;tables:Record<string,Row[]>};
export interface SnapshotStorage {
 read(etag?:string):Promise<{etag:string;snapshot?:Snapshot}|null>;
 write(snapshot:Snapshot,etag?:string):Promise<string>;
}
export class SnapshotConflictError extends Error { readonly code='BLOB_CONFLICT'; }
function encode(value:any):any {if(typeof value==='bigint')return value.toString();if(value instanceof Uint8Array)return {__base64:Buffer.from(value).toString('base64')};if(value instanceof Date)return value.toISOString();if(Array.isArray(value))return value.map(encode);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,encode(item)]));return value;}
export async function createSnapshotDB(storage:SnapshotStorage){
 const pg=new PGlite('memory://');await pg.waitReady;await pg.exec(schema);
 let etag:string|undefined;let checkedAt=0;let media=new Map<string,any>();let queue:Promise<any>=Promise.resolve();
 const serial=<T>(fn:()=>Promise<T>):Promise<T>=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
 const raw=(client:any):DB=>({query:async(sql,params=[])=>{const rows=(await client.query(sql,params)).rows;return rows.map((row:Row)=>{if(row.id&&Object.hasOwn(row,'data')&&media.has(row.id)&&row.data?.byteLength===0)return {...row,data:Buffer.from(media.get(row.id).__base64,'base64')};return row;});},transaction:fn=>client===pg?pg.transaction((tx:any)=>fn(raw(tx))):fn(raw(client))});
 const restore=async(snapshot:Snapshot)=>{
  const nextMedia=new Map<string,any>();
  await pg.transaction(async tx=>{
   for(const table of [...snapshotTables].reverse())await tx.query(`DELETE FROM art.${table}`);
   for(const table of snapshotTables)for(const row of snapshot.tables[table]||[]){
    const columns=Object.keys(row);if(!columns.length)continue;
    if(table==='media'&&row.data?.__base64)nextMedia.set(row.id,row.data);
    const values=columns.map(column=>{const value=row[column];if(table==='media'&&column==='data'&&value?.__base64)return Buffer.alloc(0);if(value?.__base64)return Buffer.from(value.__base64,'base64');return table==='audit_logs'&&column==='details'?JSON.stringify(value):value;});
    await tx.query(`INSERT INTO art.${table}(${columns.map(c=>`"${c}"`).join(',')}) VALUES(${columns.map((_,i)=>`$${i+1}`).join(',')})`,values);
   }
   await tx.exec("SELECT setval(pg_get_serial_sequence('art.audit_logs','id'), COALESCE(MAX(id),1), MAX(id) IS NOT NULL) FROM art.audit_logs");
  });media=nextMedia;
 };
 const refresh=async(force=false)=>{
  if(!force&&Date.now()-checkedAt<1000)return;
  const current=await storage.read(etag);checkedAt=Date.now();
  if(current?.snapshot){await restore(current.snapshot);etag=current.etag;}
  else if(current)etag=current.etag;
  else if(etag)throw new Error('Database snapshot is missing');
 };
 const save=async(client:any)=>{
  const tables:Record<string,Row[]>={};
  for(const table of snapshotTables){const rows=(await client.query(`SELECT * FROM art.${table}`)).rows;tables[table]=encode(rows.map((row:Row)=>table==='media'&&row.data?.byteLength===0&&media.has(row.id)?{...row,data:media.get(row.id)}:row));}
  const snapshot:Snapshot={version:1,savedAt:new Date().toISOString(),tables};
  const next=await storage.write(snapshot,etag);
  return {etag:next,media:new Map((tables.media||[]).map(row=>[row.id,row.data]))};
 };
 const mutate=async<T>(fn:(db:DB)=>Promise<T>):Promise<T>=>{
  for(let attempt=0;attempt<4;attempt++){
   await refresh(true);
   try{
    const result=await pg.transaction(async tx=>{const value=await fn(raw(tx));const saved=await save(tx);return {value,saved};});
    etag=result.saved.etag;media=result.saved.media;checkedAt=Date.now();return result.value;
   }catch(error){if(!(error instanceof SnapshotConflictError)||attempt===3)throw error;checkedAt=0;}
  }throw new SnapshotConflictError('Concurrent update could not be saved');
 };
 await refresh(true);
 if(!etag)await mutate(tx=>seedLocal(tx));
 // Existing reads never upload the entire database. Only an actual legacy migration saves.
 const categories=await raw(pg).query('SELECT id,name FROM art.categories');
 if(categories.some(row=>['illustration','landscape','portrait','still-life'].includes(row.id)||row.id==='painting'&&row.name!=='งานศิลปะ'))await mutate(tx=>simplifyCategories(tx));
 const db:DB&{close:()=>Promise<void>}={
  refresh:()=>serial(()=>refresh(true)),
  query:(sql,params=[])=>serial(async()=>{if(/^\s*(INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(sql))return mutate(tx=>tx.query(sql,params));await refresh();return raw(pg).query(sql,params);}),
  transaction:fn=>serial(()=>mutate(fn)),close:()=>serial(()=>pg.close())
 };return db;
}

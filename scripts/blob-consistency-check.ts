import assert from 'node:assert/strict';
import { createSnapshotDB, SnapshotConflictError, type Snapshot, type SnapshotStorage } from '../lib/blob-store-db';
let saved:Snapshot|null=null,version=0,writes=0,failNext=false,conflicts=0;
const storage:SnapshotStorage={read:async etag=>{if(!saved)return null;return etag===String(version)?{etag:String(version)}:{etag:String(version),snapshot:structuredClone(saved)};},write:async(data,etag)=>{if(failNext){failNext=false;throw Error('simulated storage failure');}if(etag!==(saved?String(version):undefined)){conflicts++;throw new SnapshotConflictError('stale writer');}saved=structuredClone(data);writes++;return String(++version);}};
async function main(){
 const a=await createSnapshotDB(storage),b=await createSnapshotDB(storage);
 try {
  assert.equal(writes,1,'a read-only cold start must not overwrite the store');
  const originalRead=storage.read;storage.read=async etag=>{const result=await originalRead(etag);return result&&!result.snapshot?{etag:''}:result;};
  await a.refresh!();
  await a.query("UPDATE art.artworks SET deleted=true WHERE id='sample-1'");
  await b.query("INSERT INTO art.categories(id,name) VALUES('other-write','Other writer')");
  assert.equal(saved!.tables.artworks.find(x=>x.id==='sample-1')!.deleted,true,'a stale warm worker must not resurrect deleted artwork');
  assert.equal((await b.query("SELECT deleted FROM art.artworks WHERE id='sample-1'"))[0].deleted,true);
  const image=Buffer.from('original image bytes');await a.query("INSERT INTO art.media(id,owner_id,kind,data) VALUES('roundtrip-image','demo-artist','art',$1)",[image]);
  const c=await createSnapshotDB(storage);try{assert.deepEqual(Buffer.from((await c.query("SELECT * FROM art.media WHERE id='roundtrip-image'"))[0].data),image);await c.query("UPDATE art.users SET bio='metadata only' WHERE id='demo-artist'");assert.equal(saved!.tables.media.find(x=>x.id==='roundtrip-image')!.data.__base64,image.toString('base64'));}finally{await c.close();}
  await Promise.all([a.query("INSERT INTO art.categories(id,name) VALUES('race-a','Race A')"),b.query("INSERT INTO art.categories(id,name) VALUES('race-b','Race B')")]);
  assert.ok(saved!.tables.categories.some(x=>x.id==='race-a'));assert.ok(saved!.tables.categories.some(x=>x.id==='race-b'));assert.ok(conflicts>0,'conflicting writes must be retried');
  failNext=true;await assert.rejects(a.query("UPDATE art.artworks SET title='must roll back' WHERE id='sample-2'"));
  assert.notEqual((await a.query("SELECT title FROM art.artworks WHERE id='sample-2'"))[0].title,'must roll back');
  assert.notEqual(saved!.tables.artworks.find(x=>x.id==='sample-2')!.title,'must roll back');
  console.log('PASS cold starts do not save; deletion survives stale workers; ETag retries preserve both writes; lazy images round-trip; failed writes roll back');
 }finally{await a.close();await b.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

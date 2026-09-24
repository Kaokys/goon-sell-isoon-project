import { loadEnvConfig } from '@next/env';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { schema } from '../lib/schema';
import { hashPassword } from '../lib/password';
import { seedLocal } from '../lib/seed';
import type { DB } from '../lib/db';
loadEnvConfig(process.cwd());
async function main(){
 const url=process.env.DATABASE_URL;
 if(!url){console.log('Local mode: run npm run dev. Database and demo accounts are initialized automatically.');return;}
 const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();const password=process.env.ADMIN_PASSWORD;
 if(!email||!/^\S+@\S+\.\S+$/.test(email)||!password||password.length<12)throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) in .env.local before setup.');
 const sql=postgres(url,{ssl:'require',prepare:false,max:1});
 const adapter=(client:any):DB=>({query:async(text,params=[])=>Array.from(await client.unsafe(text,params)) as any,transaction:fn=>client.begin((tx:any)=>fn(adapter(tx)))});
 try{
  await sql.unsafe(schema);
  if(process.env.SEED_DEMO==='true')await seedLocal(adapter(sql),true);
  for(const [id,name]of[['painting','จิตรกรรม'],['landscape','ทิวทัศน์'],['portrait','ภาพบุคคล'],['still-life','หุ่นนิ่ง']])await sql`INSERT INTO art.categories(id,name) VALUES(${id},${name}) ON CONFLICT(id) DO NOTHING`;
  const existing=await sql`SELECT id,role FROM art.users WHERE email=${email}`;
  if(existing.length){if(existing[0].role!=='admin')throw new Error('ADMIN_EMAIL already belongs to a non-admin account; no privilege change performed.');console.log('Schema checked; existing admin preserved.');}
  else{const hash=await hashPassword(password);await sql`INSERT INTO art.users(id,email,password_hash,name,role) VALUES(${randomUUID()},${email},${hash},'ผู้ดูแลร้าน','admin')`;console.log('Schema initialized and initial administrator created.');}
  if(process.env.SEED_DEMO==='true')await sql`UPDATE art.users SET active=false WHERE id='demo-admin' OR id='demo-customer'`;
 }finally{await sql.end();}
}
main().catch(e=>{console.error(e.message);process.exit(1);});

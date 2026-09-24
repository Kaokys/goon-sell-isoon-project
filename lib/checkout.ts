import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import addresses from '../data/thai-addresses.json';
import { addressSchema } from './validation';
import { AppError, requireUser } from './auth';
import { audit, type DB } from './db';
export const formatAddress=(a:Record<string,any>)=>`${a.line1}\n${a.province==='กรุงเทพมหานคร'?'แขวง':'ตำบล'}${a.subdistrict} ${a.province==='กรุงเทพมหานคร'?'เขต':'อำเภอ'}${a.district}\n${a.province} ${a.postcode}`;
export function paymentOptions(){
 const demo=!process.env.DATABASE_URL&&!process.env.VERCEL;
 const promptpay=!!process.env.PROMPTPAY_ID&&/^(0\d{9}|\d{13})$/.test(process.env.PROMPTPAY_ID);
 const bank=!!(process.env.BANK_NAME&&process.env.BANK_ACCOUNT_NAME&&process.env.BANK_ACCOUNT_NUMBER);
 return {demo,shipping_fee:0,methods:[{id:'promptpay',name:'สแกน QR PromptPay',description:'สแกนผ่านแอปธนาคาร แล้วแนบสลิป',enabled:promptpay||demo,configured:promptpay},{id:'bank_transfer',name:'โอนผ่านบัญชีธนาคาร',description:'โอนเข้าบัญชีร้าน แล้วแนบสลิป',enabled:bank||demo,configured:bank}]};
}
export function geography(url:URL){
 const province=url.searchParams.get('province');const district=url.searchParams.get('district');const subdistrict=url.searchParams.get('subdistrict');
 const rows=addresses.filter(a=>(!province||a.province===province)&&(!district||a.amphoe===district)&&(!subdistrict||a.district===subdistrict));
 const values=(key:'province'|'amphoe'|'district'|'zipcode')=>Array.from(new Set(rows.map(a=>String(a[key])))).sort((a,b)=>a.localeCompare(b,'th'));
 return {provinces:values('province'),districts:province?values('amphoe'):[],subdistricts:district?values('district'):[],postcodes:subdistrict?values('zipcode'):[]};
}
export async function addressHandler(req:Request,db:DB,id?:string){
 const user=await requireUser();const json=(v:any,status=200)=>NextResponse.json(v,{status,headers:{'Cache-Control':'no-store'}});
 if(req.method==='GET')return json({items:await db.query('SELECT * FROM art.addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at DESC',[user.id])});
 if((req.method==='PATCH'||req.method==='DELETE')&&!id)throw new AppError(400,'กรุณาระบุที่อยู่');
 if(req.method==='POST'&&id)throw new AppError(405,'ไม่รองรับคำขอนี้');
 return db.transaction(async tx=>{
  await tx.query('SELECT id FROM art.users WHERE id=$1 FOR UPDATE',[user.id]);
  let existing;
  if(id){[existing]=await tx.query('SELECT * FROM art.addresses WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,user.id]);if(!existing)throw new AppError(404,'ไม่พบที่อยู่');}
  if(req.method==='DELETE'){
   await tx.query('DELETE FROM art.addresses WHERE id=$1 AND user_id=$2',[id,user.id]);
   if(existing?.is_default)await tx.query('UPDATE art.addresses SET is_default=true WHERE id=(SELECT id FROM art.addresses WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1)',[user.id]);
   await audit(tx,user.id,'delete','address',id!);return json({ok:true});
  }
  const raw=await req.text();if(raw.length>6000)throw new AppError(413,'ข้อมูลยาวเกินไป');let input;try{input=JSON.parse(raw);}catch{throw new AppError(400,'ข้อมูลไม่ถูกต้อง');}
  const v=addressSchema.parse(input);
  if(!addresses.some(a=>a.province===v.province&&a.amphoe===v.district&&a.district===v.subdistrict&&String(a.zipcode)===v.postcode))throw new AppError(400,'จังหวัด อำเภอ ตำบล และรหัสไปรษณีย์ไม่ตรงกัน');
  const [count]=await tx.query('SELECT COUNT(*)::int AS n FROM art.addresses WHERE user_id=$1',[user.id]);if(!id&&count.n>=20)throw new AppError(400,'บันทึกที่อยู่ได้สูงสุด 20 รายการ');
  const isDefault=v.is_default||count.n===0||existing?.is_default===true;
  if(isDefault)await tx.query('UPDATE art.addresses SET is_default=false WHERE user_id=$1',[user.id]);
  const key=id||randomUUID();const vals=[v.recipient,v.phone,v.line1,v.province,v.district,v.subdistrict,v.postcode,v.label,isDefault,key,user.id];
  if(id)await tx.query('UPDATE art.addresses SET recipient=$1,phone=$2,line1=$3,province=$4,district=$5,subdistrict=$6,postcode=$7,label=$8,is_default=$9,updated_at=now() WHERE id=$10 AND user_id=$11',vals);
  else await tx.query('INSERT INTO art.addresses(recipient,phone,line1,province,district,subdistrict,postcode,label,is_default,id,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',vals);
  await audit(tx,user.id,id?'update':'create','address',key,{is_default:isDefault});return json({id:key},id?200:201);
 });
}

import { randomBytes, randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getDB, audit } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { hashPassword } from '@/lib/password';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const fail=(request:Request,message:string)=>NextResponse.redirect(new URL('/login?google_error='+encodeURIComponent(message),request.url));

export async function GET(request:Request){
 const url=new URL(request.url);const code=url.searchParams.get('code');const state=url.searchParams.get('state');const store=await cookies();const expected=store.get('google_oauth_state')?.value;const verifier=store.get('google_oauth_verifier')?.value;store.delete('google_oauth_state');store.delete('google_oauth_verifier');
 if(!code||!state||!expected||state!==expected||!verifier)return fail(request,'การยืนยันกับ Google หมดอายุ กรุณาลองใหม่');
 const clientId=process.env.GOOGLE_CLIENT_ID,clientSecret=process.env.GOOGLE_CLIENT_SECRET;if(!clientId||!clientSecret)return fail(request,'Google Login ยังไม่ได้ตั้งค่า');
 try{
  const redirectUri=new URL('/api/auth/google/callback',process.env.APP_URL||request.url).toString();
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:verifier}),cache:'no-store'});const token=await tokenResponse.json();if(!tokenResponse.ok||!token.access_token)throw new Error('token exchange failed');
  const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`},cache:'no-store'});const profile=await profileResponse.json();if(!profileResponse.ok||!profile.sub||!profile.email||profile.email_verified!==true)throw new Error('unverified Google profile');
  const db=await getDB();const email=String(profile.email).trim().toLowerCase();let [user]=await db.query('SELECT * FROM art.users WHERE google_sub=$1 OR email=$2',[profile.sub,email]);
  if(user){if(!user.active)return fail(request,'บัญชีนี้ถูกปิดใช้งาน');if(user.google_sub&&user.google_sub!==profile.sub)return fail(request,'อีเมลนี้เชื่อมกับบัญชี Google อื่นแล้ว');if(!user.google_sub)await db.query('UPDATE art.users SET google_sub=$1 WHERE id=$2',[profile.sub,user.id]);}
  else{const id=randomUUID();const password=await hashPassword(randomBytes(48).toString('base64url'));await db.transaction(async tx=>{await tx.query('INSERT INTO art.users(id,email,password_hash,name,google_sub) VALUES($1,$2,$3,$4,$5)',[id,email,password,String(profile.name||email.split('@')[0]).slice(0,100),profile.sub]);await audit(tx,id,'register_google','user',id);});[user]=await db.query('SELECT * FROM art.users WHERE id=$1',[id]);}
  await createSession(db,user.id);return NextResponse.redirect(new URL('/',process.env.APP_URL||request.url));
 }catch(error){console.error('Google OAuth error',error);return fail(request,'เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่');}
}

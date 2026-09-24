import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(request:Request){
 const clientId=process.env.GOOGLE_CLIENT_ID;
 if(!clientId)return NextResponse.redirect(new URL('/login?google_error='+encodeURIComponent('Google Login ยังไม่ได้ตั้งค่า'),request.url));
 const state=randomBytes(24).toString('hex');const verifier=randomBytes(48).toString('base64url');const challenge=createHash('sha256').update(verifier).digest('base64url');
 const store=await cookies();const secure=!!process.env.VERCEL||process.env.APP_URL?.startsWith('https://');
 store.set('google_oauth_state',state,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:600});store.set('google_oauth_verifier',verifier,{httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:600});
 const callback=new URL('/api/auth/google/callback',process.env.APP_URL||request.url).toString();
 const params=new URLSearchParams({client_id:clientId,redirect_uri:callback,response_type:'code',scope:'openid email profile',state,code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'});
 return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

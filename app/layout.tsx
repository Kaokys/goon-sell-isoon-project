import { sessionUser, publicUser } from '@/lib/auth';
import { AppProvider } from '@/components/shared';
import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import './checkout.css';
export const metadata:Metadata={title:'SILLAPA — ศิลปะที่เป็นคุณ',description:'ค้นพบและสะสมผลงานศิลปะจากศิลปินนักศึกษา',icons:{icon:'/favicon.svg'}};
export default async function RootLayout({children}:{children:React.ReactNode}){let initialSession:any=null;if(!process.env.VERCEL)try{const user=await sessionUser();initialSession={user:user?publicUser(user):null,demo:!!process.env.BLOB_READ_WRITE_TOKEN||!process.env.VERCEL,paymentConfigured:true,googleConfigured:!!(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)};}catch{}return <html lang="th"><body><AppProvider initialSession={initialSession}>{children}</AppProvider></body></html>;}

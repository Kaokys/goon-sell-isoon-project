import type { Metadata } from 'next';
import './globals.css';
import './checkout.css';
export const metadata:Metadata={title:'SILLAPA — ศิลปะที่เป็นคุณ',description:'ค้นพบและสะสมผลงานศิลปะจากศิลปินนักศึกษา',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>;}

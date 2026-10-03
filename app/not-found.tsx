import Link from 'next/link';
export default function NotFound(){return <main className="fallback-page"><span className="eyebrow">404</span><h1>ไม่พบหน้านี้</h1><p>ลิงก์อาจเปลี่ยนหรือไม่มีหน้านี้แล้ว เลือกดูผลงานต่อได้เลย</p><div className="profile-actions"><Link className="button primary" href="/gallery">เลือกดูงานศิลปะ</Link><Link className="button" href="/">กลับหน้าแรก</Link></div></main>;}

import Marketplace from '@/components/marketplace';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Page({params}:{params:Promise<{slug?:string[]}>}){const {slug=[]}=await params;const [root,tab]=slug;const single=['gallery','artists','login','register','cart','orders','addresses','profile','credits'];const workspace=['artworks','orders','users','categories','logs','poster'];const valid=!slug.length||(slug.length===1&&(single.includes(root)||['admin','studio'].includes(root)))||(slug.length===2&&(['artworks','artists','orders','profiles'].includes(root)||['admin','studio'].includes(root)&&workspace.includes(tab)))||(slug.length===3&&root==='admin'&&tab==='orders');if(!valid)notFound();return <Marketplace/>;}

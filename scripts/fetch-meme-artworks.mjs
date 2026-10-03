import fs from 'node:fs/promises';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const sources=[
 ['Benjamin Approves','blue','TTheBigBlue892','https://tenor.com/view/benjamin-netanyahu-approved-gif-17723057525056256264'],
 ['Ben 10 Stare','green','RRellxtra','https://tenor.com/vi/view/ben-10-ben-10-stare-gif-15409871389790827857'],
 ['Big Yahu Dance','blue','omamnz','https://tenor.com/view/benjamin-netanyahu-dance-benjamin-netanyahu-dance-gif-17830850143863215782'],
 ['Ben 10 Confused','green','CartoonNetworkLA','https://tenor.com/view/desconcertado-ben-ben10-parpadear-confundido-gif-24148949'],
 ['Tel Aviv Impressed','blue','WWiiGalaxy','https://tenor.com/view/big-yahu-tel-aviv-impressed-netanyahu-israel-gif-13606388048953703900'],
 ['Gwen Huh?','green','CartoonNetworkLA','https://tenor.com/es-419/view/huh-gwen-tennyson-ben10-what-confused-gif-16313460'],
 ['Benjamin Thumbs Up','blue','tonota','https://tenor.com/view/benjamin-netanyahu-benjamin-netanyahu-politician-politics-gif-15962329521321005085'],
 ['Ben 10 Dance Time','green','CCartoonNetworkBr','https://tenor.com/view/dancando-gwen-tennyson-ben10-dancing-groove-gif-16703224']
];
const variants={},credits=[];
for(let index=0;index<sources.length;index++){
 const [title,color,fallbackArtist,source_url]=sources[index];const id=index+1;
 const page=await fetch(source_url);if(!page.ok)throw Error('Source unavailable: '+source_url);const html=await page.text();const artist=html.match(/"author":"([^"]+)"/)?.[1]||fallbackArtist;const match=html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);if(!match)throw Error('No source image: '+source_url);
 const asset=await fetch(match[1]);if(!asset.ok)throw Error('Image unavailable');const bytes=Buffer.from(await asset.arrayBuffer());
 const metadata=await sharp(bytes).metadata();
 // Preserve the image from the source: first GIF frame, with no generated content.
 const filename=`art-${id}.jpg`;const jpeg=await sharp(bytes,{page:0,pages:1}).jpeg({quality:90}).toBuffer();await fs.writeFile('public/art/'+filename,jpeg);
 const entry={};for(const [key,width] of [['small',480],['large',960]]){const data=await sharp(jpeg).resize({width,withoutEnlargement:true}).webp({quality:82}).toBuffer();const variant=`art-${id}-${width}-${createHash('sha256').update(data).digest('hex').slice(0,8)}.webp`;await fs.writeFile('public/art/'+variant,data);entry[key]='/art/'+variant;}variants['/art/'+filename]=entry;
 credits.push({id,title,color,artist,filename,license:'ภาพจาก Tenor ใช้สาธิตระบบ ไม่ได้อ้างสิทธิ์ในภาพ',source_url,original_url:match[1],width:metadata.width,height:metadata.pageHeight||metadata.height});
 console.log('Downloaded:',title);
}
const retained=new Set(Object.values(variants).flatMap(Object.values).map(url=>url.split('/').pop()));
for(const filename of await fs.readdir('public/art'))if(filename.endsWith('.webp')&&!retained.has(filename))await fs.unlink('public/art/'+filename);
await fs.writeFile('public/art/variants.json',JSON.stringify(variants,null,2)+'\n');await fs.writeFile('public/art/attributions.json',JSON.stringify(credits,null,2)+'\n');

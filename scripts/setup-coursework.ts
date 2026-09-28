import { loadEnvConfig } from '@next/env';
import postgres from 'postgres';
import type { DB } from '../lib/db';
import { schema } from '../lib/schema';
import { seedLocal } from '../lib/seed';

loadEnvConfig(process.cwd());

function adapter(client: any): DB {
  return {
    query: async (text, params = []) => Array.from(await client.unsafe(text, params)) as any,
    transaction: (fn) => client.begin((tx: any) => fn(adapter(tx))),
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'ยังไม่พบ DATABASE_URL: เปิด Vercel > Storage > Marketplace > Neon เชื่อมฐานข้อมูลกับโปรเจกต์ แล้วกด Redeploy',
    );
  }

  const sql = postgres(url, { ssl: 'require', prepare: false, max: 1 });
  try {
    await sql.unsafe(schema);
    await seedLocal(adapter(sql));
    console.log('Coursework database is ready: schema, demo users, and sample artworks checked.');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

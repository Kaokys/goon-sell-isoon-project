import artVariants from './public/art/variants.json';
import type { NextConfig } from 'next';
const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  devIndicators: false,
  serverExternalPackages: ['@electric-sql/pglite', 'sharp'],
  poweredByHeader: false,
  async headers() { return [...Object.values(artVariants).flatMap(v=>[v.small,v.large]).map(source=>({source,headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]})),{source:'/fonts/:path*',headers:[{key:'Cache-Control',value:'public, max-age=31536000, immutable'}]},{ source: '/:path*', headers: [
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]}]; }
};
export default config;

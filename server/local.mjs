import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {handle} from './service.js';
export class MemoryCache{
 constructor(){this.items=new Map();}
 async match(key){const v=this.items.get(key.url);return v?new Response(v.body,{headers:v.headers}):undefined;}
 async put(key,value){this.items.set(key.url,{body:await value.text(),headers:Object.fromEntries(value.headers)});}
}
const root=resolve(import.meta.dirname,'../public');const assets={};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
async function walk(dir,prefix=''){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||ent.name.startsWith('_'))continue;const key=prefix+'/'+ent.name;if(ent.isDirectory())await walk(join(dir,ent.name),key);else if(mime[extname(ent.name)])assets[key]={body:await readFile(join(dir,ent.name),'utf8'),type:mime[extname(ent.name)]};}}
await walk(root);const cache=new MemoryCache();
// Node 22+, no packages. Bind loopback; use Apache as your public HTTPS reverse proxy.
const port=Number(process.env.PORT||4173);const host=process.env.HOST||'127.0.0.1';
createServer(async(req,res)=>{try{const response=await handle(new Request('http://localhost'+req.url,{method:req.method}),assets,cache);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503,{'Content-Type':'text/plain'});res.end('Reader temporarily unavailable');}}).listen(port,host,()=>console.log(`net HUSH listening on http://${host}:${port}`));

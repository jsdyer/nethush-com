import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {application} from './application.js';
import {Store} from './store.js';
import {openDatabase} from './sqlite.mjs';
import {NodeAuth} from './auth-node.mjs';
export class MemoryCache{
 constructor(){this.items=new Map();}
 async match(key){const v=this.items.get(key.url);return v?new Response(v.body,{headers:v.headers}):undefined;}
 async put(key,value){this.items.set(key.url,{body:await value.text(),headers:Object.fromEntries(value.headers)});}
}
const root=resolve(import.meta.dirname,'../public'),assets={};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
async function walk(dir,prefix=''){for(const ent of await readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('.')||ent.name.startsWith('_'))continue;const key=prefix+'/'+ent.name;if(ent.isDirectory())await walk(join(dir,ent.name),key);else if(mime[extname(ent.name)])assets[key]={body:await readFile(join(dir,ent.name),'utf8'),type:mime[extname(ent.name)]};}}
await walk(root);const cache=new MemoryCache();
process.umask(0o077);
const db=openDatabase(process.env.NETHUSH_DB||resolve(import.meta.dirname,'../var/nethush.sqlite'));const store=new Store(db);
const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1';
const origin=process.env.NETHUSH_ORIGIN||`http://127.0.0.1:${port}`,auth=new NodeAuth(store,origin);
createServer(async(req,res)=>{
 try{
  // Explicit canonical origin; Host/X-Forwarded-* and platform identity headers are never trusted.
  if(!req.url.startsWith('/')||req.url.startsWith('//')){res.writeHead(400);res.end('Invalid path');return;}
  const headers=new Headers();for(const key of ['content-type','content-length','cookie','origin','sec-fetch-site','sec-gpc','dnt','x-nethush-csrf'])if(typeof req.headers[key]==='string')headers.set(key,req.headers[key]);
  let body;if(!['GET','HEAD'].includes(req.method)){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8192){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}body=Buffer.concat(chunks);}
  const request=new Request(origin+req.url,{method:req.method,headers,...(body?{body}:{} )});
  const response=await application(request,{assets,cache,store,origin,identify:r=>auth.identify(r),authEndpoint:r=>auth.endpoint(r)});
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(503,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Service temporarily unavailable');}
}).listen(port,host,()=>console.log(`net HUSH listening on http://${host}:${port}`));

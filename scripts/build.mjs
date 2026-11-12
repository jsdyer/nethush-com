import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {extname} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const assets={};async function walk(path,prefix=''){for(const f of await readdir(path,{withFileTypes:true})){if(f.name.startsWith('.')||f.name.startsWith('_'))continue;const rel=prefix+'/'+f.name;if(f.isDirectory())await walk(path+'/'+f.name,rel);else if(types[extname(f.name)])assets[rel]={body:await readFile(path+'/'+f.name,'utf8'),type:types[extname(f.name)]};}}
await walk('public');
const modules=['public/assets/catalog.js','server/service.js','server/store.js','server/admin.js','server/application.js'];
const code=(await Promise.all(modules.map(async file=>(await readFile(file,'utf8')).replace(/^import .*;\n/gm,'')))).join('\n');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',code+'\nconst ASSETS='+JSON.stringify(assets)+`;
const hostedStores=new WeakMap();
export default {fetch(request,env){let store;if(env.DB){store=hostedStores.get(env.DB);if(!store){store=new Store(env.DB);hostedStores.set(env.DB,store);}}return application(request,{assets:ASSETS,cache:caches.default,store,origin:new URL(request.url).origin,identify:async r=>platformAuth(r,env.NETHUSH_ADMIN_EMAIL)});}};
`);
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built dependency-free Worker with embedded first-party assets.');

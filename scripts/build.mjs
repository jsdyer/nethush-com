import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {extname} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const assets={};async function walk(path,prefix=''){for(const f of await readdir(path,{withFileTypes:true})){if(f.name.startsWith('.')||f.name.startsWith('_'))continue;const rel=prefix+'/'+f.name;if(f.isDirectory())await walk(path+'/'+f.name,rel);else if(types[extname(f.name)])assets[rel]={body:await readFile(path+'/'+f.name,'utf8'),type:types[extname(f.name)]};}}
await walk('public');
const catalog=await readFile('public/assets/catalog.js','utf8');
const service=(await readFile('server/service.js','utf8')).replace("import {SOURCES} from '../public/assets/catalog.js';",'');
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',catalog+'\n'+service+'\nconst ASSETS='+JSON.stringify(assets)+';\nexport default {fetch(request,env,ctx){return handle(request,ASSETS,caches.default);}};\n');
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built dependency-free Worker with embedded first-party assets.');

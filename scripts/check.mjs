import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+f.name;if(f.isDirectory())await walk(path);else if(/\.(m?js)$/.test(path)){const r=spawnSync(process.execPath,['--check',path],{stdio:'inherit'});if(r.status)process.exit(r.status);}}}
for(const dir of ['public','server','scripts'])await walk(dir);
console.log('JavaScript syntax checks passed.');

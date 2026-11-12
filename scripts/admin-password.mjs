import {openDatabase} from '../server/sqlite.mjs';
import {Store} from '../server/store.js';
import {setAdminPassword} from '../server/auth-node.mjs';
import {resolve} from 'node:path';
process.umask(0o077);
if(!process.stdin.isTTY){console.error('Run this command in an interactive terminal. Password input is hidden.');process.exit(1);}
function hidden(prompt){return new Promise((resolve,reject)=>{process.stdout.write(prompt);let value='';process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');const onData=chunk=>{for(const char of chunk){if(char==='\u0003'){done();reject(new Error('Cancelled'));return;}if(char==='\r'||char==='\n'){done();resolve(value);return;}if(char==='\u007f'){value=value.slice(0,-1);}else if(char>=' '&&value.length<256)value+=char;}};const done=()=>{process.stdin.removeListener('data',onData);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');};process.stdin.on('data',onData);});}
const password=await hidden('New admin password (16–256 characters): ');const again=await hidden('Repeat password: ');if(password!==again)throw new Error('Passwords do not match. Nothing changed.');
const db=openDatabase(process.env.NETHUSH_DB||resolve(import.meta.dirname,'../var/nethush.sqlite'));try{await setAdminPassword(new Store(db),password);console.log('Admin password saved. Existing admin sessions were revoked.');}finally{db.close();}

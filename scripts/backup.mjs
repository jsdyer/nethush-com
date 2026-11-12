import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
process.umask(0o077);
const source=process.env.NETHUSH_DB||resolve(import.meta.dirname,'../var/nethush.sqlite'),destination=process.argv[2];
if(!destination||!destination.startsWith('/')||existsSync(destination)){console.error('Provide a new absolute backup path. Existing files are never replaced.');process.exit(1);}
if(!existsSync(source))throw new Error('Source database does not exist.');
mkdirSync(dirname(destination),{recursive:true,mode:0o700});
const db=new DatabaseSync(source,{readOnly:true});try{await backup(db,destination);chmodSync(destination,0o600);console.log('Database backup completed. Keep this file private.');}finally{db.close();}

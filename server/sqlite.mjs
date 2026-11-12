import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync,readdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
export function openDatabase(path){
 if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
 if(path!==':memory:')chmodSync(path,0o600);
 // Migrations run at process startup, never from a web request.
 db.exec('CREATE TABLE IF NOT EXISTS nethush_migrations(name TEXT PRIMARY KEY)');
 const directory=new URL('../drizzle/',import.meta.url);
 for(const name of readdirSync(directory).filter(x=>x.endsWith('.sql')).sort()){
  if(db.prepare('SELECT name FROM nethush_migrations WHERE name=?').get(name))continue;
  db.exec('BEGIN IMMEDIATE');try{db.exec(readFileSync(new URL(name,directory),'utf8'));db.prepare('INSERT INTO nethush_migrations VALUES(?)').run(name);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 }
 const wrap=(sql,params=[])=>({bind(...values){return wrap(sql,values);},async all(){return {results:db.prepare(sql).all(...params)};},execute(){const stmt=db.prepare(sql);if(/\bRETURNING\b/i.test(sql)){return {results:stmt.all(...params),meta:{changes:Number(db.prepare('SELECT changes() AS n').get().n)}};}const result=stmt.run(...params);return {results:[],meta:{changes:Number(result.changes)}};},async run(){return this.execute();}});
 return {raw:db,prepare:sql=>wrap(sql),async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(s.execute());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close();}};
}

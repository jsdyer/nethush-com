import {scrypt as scryptCallback,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {json,readJson,sameOrigin} from './admin.js';
const scrypt=promisify(scryptCallback),ttl=8*3600000;
const hashToken=token=>createHash('sha256').update(token).digest('hex');
export async function setAdminPassword(store,password){
 if(typeof password!=='string'||password.length<16||password.length>256)throw new Error('Use 16–256 characters for the administrator password.');
 const salt=randomBytes(32).toString('hex'),hash=Buffer.from(await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024})).toString('hex');
 await store.batch([['INSERT INTO admin_credentials(id,salt,password_hash) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET salt=excluded.salt,password_hash=excluded.password_hash',[salt,hash]],['DELETE FROM admin_sessions',[]]]);await store.audit('admin.password_reset');
}
export class NodeAuth{
 constructor(store,origin){this.store=store;this.origin=origin;const url=new URL(origin);this.secure=url.protocol==='https:';if(!this.secure&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))throw new Error('NETHUSH_ORIGIN must use HTTPS except on loopback.');this.cookie=this.secure?'__Host-nethush_admin':'nethush_admin_local';}
 cookieValue(request){return (request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(this.cookie+'='))?.slice(this.cookie.length+1)||'';}
 async identify(request,now=Date.now()){
  // Do not accept platform identity headers on a self-hosted origin.
  const token=this.cookieValue(request);if(!/^[a-f0-9]{64}$/.test(token))return {authenticated:false,mode:'password'};
  const session=(await this.store.rows('SELECT csrf FROM admin_sessions WHERE token_hash=? AND expires_at>?',[hashToken(token),now]))[0];return {authenticated:!!session,mode:'password',csrf:session?.csrf};
 }
 cookieHeader(token,maxAge=ttl/1000){return `${this.cookie}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${this.secure?'; Secure':''}`;}
 async endpoint(request,now=Date.now()){
  const path=new URL(request.url).pathname;if(!['/api/admin/login','/api/admin/logout'].includes(path))return null;
  if(request.method!=='POST'||!sameOrigin(request,this.origin)||new URL(request.url).search)return json({error:'Same-origin POST required.'},403);
  if(path.endsWith('/logout')){
   const auth=await this.identify(request,now);if(!auth.authenticated||request.headers.get('X-NetHush-CSRF')!==auth.csrf)return json({error:'Access denied.'},403);
   await this.store.run('DELETE FROM admin_sessions WHERE token_hash=?',[hashToken(this.cookieValue(request))]);await this.store.audit('admin.logout',now);return json({ok:true},200,{'Set-Cookie':this.cookieHeader('',0)});
  }
  if(!await this.store.gate('login',8,60000,now))return json({error:'Too many sign-in attempts. Wait one minute.'},429,{'Retry-After':'60'});
  let data;try{data=await readJson(request,2048);}catch{return json({error:'Invalid sign-in request.'},400);}
  if(Object.keys(data).length!==1||typeof data.password!=='string'||data.password.length>256)return json({error:'Invalid sign-in request.'},400);
  const credential=(await this.store.rows('SELECT salt,password_hash FROM admin_credentials WHERE id=1'))[0];
  // Keep the expensive check even when not configured. There is no default password.
  const calculated=Buffer.from(await scrypt(data.password,credential?.salt||'0'.repeat(64),64,{N:32768,r:8,p:1,maxmem:64*1024*1024}));
  const expected=Buffer.from(credential?.password_hash||'0'.repeat(128),'hex');
  if(!timingSafeEqual(calculated,expected)||!credential)return json({error:'Sign-in failed. If this is a new install, run npm run admin:password on the server.'},401);
  const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
  await this.store.batch([['DELETE FROM admin_sessions WHERE expires_at<=?',[now]],['INSERT INTO admin_sessions(token_hash,csrf,expires_at) VALUES(?,?,?)',[hashToken(token),csrf,now+ttl]]]);
  await this.store.audit('admin.login',now);return json({ok:true},200,{'Set-Cookie':this.cookieHeader(token)});
 }
}

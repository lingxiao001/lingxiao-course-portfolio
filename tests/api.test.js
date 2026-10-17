import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {pbkdf2Sync} from 'node:crypto';
import {handleRequest, verifyPassword} from '../server/api.js';
const password='Only-Used-In-Tests-2026';
const salt=Buffer.from('fixed-test-salt-16-bytes');
const passwordHash=`pbkdf2_sha256$100000$${salt.toString('base64')}$${pbkdf2Sync(password,salt,100000,32,'sha256').toString('base64')}`;
function env(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
 const prepare=sql=>{let args=[];const result={bind(...values){args=values;return result},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}};return result};
 return {DB:{prepare,async batch(statements){return Promise.all(statements.map(s=>s.run()))}},ADMIN_PASSWORD_HASH:passwordHash,sqlite};
}
function call(e,path,method='GET',body,session,origin='https://portfolio.example'){
 const headers={};if(body!==undefined)headers['Content-Type']='application/json';if(method!=='GET')headers.Origin=origin;if(session)headers.Cookie=session;
 return handleRequest({request:new Request('https://portfolio.example'+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),env:e});
}
async function login(e){const r=await call(e,'/api/auth/login','POST',{password});assert.equal(r.status,200);return r.headers.get('Set-Cookie').split(';')[0]}
test('public profile and projects are initialized from D1',async()=>{const e=env();const r=await call(e,'/api/profile');assert.equal(r.status,200);const data=await r.json();assert.equal(data.profile.name,'Lingxiao');assert.equal(data.projects.length,5);assert.equal(r.headers.get('Cache-Control'),'no-store');e.sqlite.close()});
test('unauthenticated and cross-origin writes are rejected',async()=>{const e=env();assert.equal((await call(e,'/api/admin/profile','PUT',{})).status,401);assert.equal((await call(e,'/api/auth/login','POST',{password},null,'https://evil.example')).status,403);e.sqlite.close()});
test('password verification is strict and session cookie is secure',async()=>{const e=env();assert.equal(await verifyPassword(password,passwordHash),true);assert.equal(await verifyPassword('wrong',passwordHash),false);assert.equal(await verifyPassword(password,'invalid'),false);const r=await call(e,'/api/auth/login','POST',{password});const cookie=r.headers.get('Set-Cookie');assert.match(cookie,/__Host-lingxiao_session=/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);assert.equal((await(await call(e,'/api/auth/session','GET',undefined,cookie)).json()).authenticated,true);e.sqlite.close()});
test('profile update survives separate requests and rejects insecure links',async()=>{const e=env(),cookie=await login(e);const old=await(await call(e,'/api/profile')).json();const updated={...old.profile,location:'后台保存与前台同步测试'};assert.equal((await call(e,'/api/admin/profile','PUT',updated,cookie)).status,200);assert.equal((await(await call(e,'/api/profile')).json()).profile.location,updated.location);assert.equal((await call(e,'/api/admin/profile','PUT',{...updated,github:'javascript:alert(1)'},cookie)).status,400);assert.equal((await call(e,'/api/admin/profile','PUT',{...updated,name:'x'.repeat(61)},cookie)).status,400);e.sqlite.close()});
test('project create, update and delete persist correctly',async()=>{const e=env(),cookie=await login(e);const p={title:'测试作品',category:'WEB APPLICATION',description:'验证作品的创建与修改',tags:['React'],url:'https://example.com',featured:true,theme:'mint'};const created=await call(e,'/api/admin/projects','POST',p,cookie);assert.equal(created.status,201);const {project}=await created.json();assert.equal((await call(e,`/api/admin/projects/${project.id}`,'PUT',{...p,title:'已修改作品'},cookie)).status,200);assert.equal((await(await call(e,'/api/profile')).json()).projects.find(x=>x.id===project.id).title,'已修改作品');assert.equal((await call(e,`/api/admin/projects/${project.id}`,'DELETE',undefined,cookie)).status,200);assert.equal((await(await call(e,'/api/profile')).json()).projects.length,5);e.sqlite.close()});
test('logout invalidates the server-side session',async()=>{const e=env(),cookie=await login(e);assert.equal((await call(e,'/api/auth/logout','POST',{},cookie)).status,200);assert.equal((await(await call(e,'/api/auth/session','GET',undefined,cookie)).json()).authenticated,false);assert.equal((await call(e,'/api/admin/projects','POST',{},cookie)).status,401);e.sqlite.close()});
test('expired sessions are refused',async()=>{const e=env(),cookie=await login(e);e.sqlite.exec('UPDATE sessions SET expires_at = 1');assert.equal((await(await call(e,'/api/auth/session','GET',undefined,cookie)).json()).authenticated,false);e.sqlite.close()});
test('repeated failed passwords are rate-limited',async()=>{const e=env();for(let n=0;n<5;n++)assert.equal((await call(e,'/api/auth/login','POST',{password:'incorrect-password'})).status,401);assert.equal((await call(e,'/api/auth/login','POST',{password})).status,429);e.sqlite.close()});
test('missing database and missing password configuration fail clearly',async()=>{assert.equal((await call({},'/api/profile')).status,503);const e=env();delete e.ADMIN_PASSWORD_HASH;assert.equal((await call(e,'/api/auth/login','POST',{password})).status,503);e.sqlite.close()});

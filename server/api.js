const SESSION_TTL = 8 * 60 * 60;
const encoder = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: {'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers} });
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
const decode64 = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export async function verifyPassword(password, encoded) {
  try {
    const [scheme, iterations, salt, expected] = encoded.split('$');
    if (scheme !== 'pbkdf2_sha256' || Number(iterations) !== 100000 || decode64(salt).length < 16 || decode64(expected).length !== 32) return false;
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const derived = new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2', salt:decode64(salt), iterations:100000, hash:'SHA-256'}, key, 256));
    const wanted = decode64(expected); let difference = 0;
    for (let i=0; i<derived.length; i++) difference |= derived[i] ^ wanted[i];
    return difference === 0;
  } catch {return false;}
}
const local = request => ['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
const cookieName = request => local(request) ? 'lingxiao_dev_session' : '__Host-lingxiao_session';
const cookie = (request, value, age=SESSION_TTL) => `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${local(request)?'':'; Secure'}`;
const sessionToken = request => request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(request)+'='))?.slice(cookieName(request).length+1) || '';
async function getSession(request, db) {
  const token = sessionToken(request); if (!/^[0-9a-f]{64}$/.test(token)) return null;
  return db.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(await hash(token), Math.floor(Date.now()/1000)).first();
}
async function readBody(request) {
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) throw new Error('请使用 JSON 格式提交');
  const text = await request.text(); if (encoder.encode(text).length > 16384) throw new Error('提交内容过长');
  try { const value = JSON.parse(text); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; } catch {throw new Error('提交内容格式有误');}
}
function string(value, label, max=300, required=true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new Error(`${label}不能为空且不能超过 ${max} 字`);
  return value.trim();
}
function url(value, label, required=false) {
  const v=string(value,label,1000,required); if (!v) return '';
  try {const parsed = new URL(v); if (parsed.protocol !== 'https:') throw new Error(); return parsed.href;} catch {throw new Error(`${label}须为完整的 HTTPS 地址`);}
}
function validateProfile(body) {
  return {name:string(body.name,'名字',60), eyebrow:string(body.eyebrow,'副标题',80), headline:string(body.headline,'主标题',100), intro:string(body.intro,'简介',600), about:string(body.about,'关于我',2000), github:url(body.github,'GitHub 地址',true), focus:string(body.focus,'关注方向',150), location:string(body.location,'个人状态',100)};
}
function validateProject(body) {
  const tags = Array.isArray(body.tags) ? body.tags : [];
  if (tags.length > 5) throw new Error('每个作品最多 5 个标签');
  return {title:string(body.title,'作品名',100), category:string(body.category,'分类',80), description:string(body.description,'说明',600), tags:tags.map(tag=>string(tag,'标签',40)), url:url(body.url,'作品链接'), featured:!!body.featured, theme:['mint','peach','lavender'].includes(body.theme)?body.theme:'mint'};
}
async function content(db) {
  const profile = await db.prepare("SELECT data FROM content WHERE key = 'profile'").first();
  const projects = await db.prepare('SELECT id, data FROM projects ORDER BY position ASC, id ASC').all();
  if (!profile) throw new Error('数据库尚未初始化，请先执行 schema.sql');
  return {profile:JSON.parse(profile.data), projects:projects.results.map(row=>({id:row.id,...JSON.parse(row.data)}))};
}
export async function handleRequest({request, env}) {
  const path = new URL(request.url).pathname.replace(/\/$/,''); const method = request.method;
  if (!env.DB) return json({error:'数据库尚未连接'},503);
  if (method !== 'GET' && method !== 'HEAD' && request.headers.get('Origin') !== new URL(request.url).origin) return json({error:'请求来源不匹配'},403);
  try {
    if (path === '/api/profile' && method==='GET') return json(await content(env.DB));
    if (path === '/api/auth/session' && method==='GET') return json({authenticated:!!(await getSession(request,env.DB))});
    if (path === '/api/auth/login' && method==='POST') {
      if (!env.ADMIN_PASSWORD_HASH) return json({error:'管理员密码尚未配置'},503);
      const body=await readBody(request); const password=string(body.password,'密码',200);
      const now=Math.floor(Date.now()/1000); const ip=await hash(request.headers.get('CF-Connecting-IP') || (local(request)?'local':'unknown'));
      await env.DB.prepare('DELETE FROM login_attempts WHERE created_at < ?').bind(now-900).run();
      const attempts=await env.DB.prepare('SELECT COUNT(*) AS count FROM login_attempts WHERE ip_hash = ? AND created_at >= ?').bind(ip,now-900).first();
      if (attempts.count>=5) return json({error:'尝试次数过多，请 15 分钟后重试'},429);
      if (!(await verifyPassword(password,env.ADMIN_PASSWORD_HASH))) {
        await env.DB.prepare('INSERT INTO login_attempts (ip_hash, created_at) VALUES (?, ?)').bind(ip,now).run();
        return json({error:'密码不正确'},401);
      }
      const token=hex(crypto.getRandomValues(new Uint8Array(32)));
      await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),env.DB.prepare('DELETE FROM login_attempts WHERE ip_hash = ?').bind(ip),env.DB.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').bind(await hash(token),now+SESSION_TTL)]);
      return json({ok:true},200,{'Set-Cookie':cookie(request,token)});
    }
    if (path === '/api/auth/logout' && method==='POST') {
      await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await hash(sessionToken(request))).run();
      return json({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
    }
    if (!path.startsWith('/api/admin/')) return json({error:'接口不存在'},404);
    if (!(await getSession(request,env.DB))) return json({error:'请先登录'},401);
    if (path === '/api/admin/profile' && method==='PUT') {
      const data=validateProfile(await readBody(request));
      await env.DB.prepare("INSERT INTO content (key,data) VALUES ('profile',?) ON CONFLICT(key) DO UPDATE SET data=excluded.data").bind(JSON.stringify(data)).run();
      return json({ok:true,profile:data});
    }
    if (path === '/api/admin/projects' && method==='POST') {
      const data=validateProject(await readBody(request)); const id=crypto.randomUUID();
      const position=await env.DB.prepare('SELECT COALESCE(MAX(position),0)+1 AS next FROM projects').first();
      await env.DB.prepare('INSERT INTO projects (id,data,position) VALUES (?,?,?)').bind(id,JSON.stringify(data),position.next).run();
      return json({ok:true,project:{id,...data}},201);
    }
    const projectMatch=path.match(/^\/api\/admin\/projects\/([a-zA-Z0-9-]{1,80})$/);
    if (projectMatch && ['PUT','DELETE'].includes(method)) {
      const existing=await env.DB.prepare('SELECT id FROM projects WHERE id = ?').bind(projectMatch[1]).first();
      if (!existing) return json({error:'作品不存在'},404);
      if (method==='DELETE') await env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(projectMatch[1]).run();
      else {const data=validateProject(await readBody(request)); await env.DB.prepare('UPDATE projects SET data = ? WHERE id = ?').bind(JSON.stringify(data),projectMatch[1]).run();}
      return json({ok:true});
    }
    return json({error:'接口不存在或不支持此操作'},404);
  } catch(error) {
    const safe = /不能为空|不能超过|最多|HTTPS|JSON|内容过长|格式有误/.test(error.message);
    return json({error:safe?error.message:'服务暂时不可用，请稍后再试'},safe?400:500);
  }
}

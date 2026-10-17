# Lingxiao 个人网站｜技术设计文档

版本：1.0 · 2026-10-17

> `TECH_DESIN.md` 保留课程问卷中的文件名拼写；`TECH_DESIGN.md` 提供相同内容的标准拼写副本。

## 1. 架构

```text
访客 / 管理员浏览器
          │ HTTPS
          ▼
Cloudflare Pages：React 静态资源
          │ /api/*
          ▼
Pages Functions：验证、鉴权、数据读写
          │ DB 绑定
          ▼
Cloudflare D1：个人资料、作品、会话、失败登录记录
```

GitHub Pages 发布路径只包含前端静态资源。构建时 `VITE_STATIC_MODE=true`，界面使用构建内的初始资料并移除后台入口，不请求动态接口。

## 2. 技术选择

| 层次 | 技术 | 用途 |
| --- | --- | --- |
| 界面 | React 19、CSS | 组件、作品筛选、编辑表单与自适应布局 |
| 图标 | Lucide React | 使用统一矢量图标 |
| 构建 | Vite 7 | 本地开发与静态资源生成 |
| 动态 API | Cloudflare Pages Functions | 公共读取、鉴权与管理员写入 |
| 数据库 | Cloudflare D1 / SQLite | 云端持久化 |
| 测试 | Node Test、内存 SQLite | 真实 SQL 与 API 行为验证 |

## 3. 目录

- `src/`：公开页面、内容管理和样式。
- `src/data.js`：静态版初始公开资料。
- `functions/api/[[path]].js`：Pages API 入口。
- `server/api.js`：路由、登录、校验与数据库访问。
- `schema.sql`：建表、索引与不覆盖现有内容的初始数据。
- `scripts/hash-password.mjs`：从标准输入读取密码并生成哈希。
- `tests/api.test.js`：接口与权限测试。
- `wrangler.jsonc`：Pages 项目和 D1 绑定。
- `dist/`：动态版构建产物；`dist-static/`：GitHub Pages 静态版。

## 4. 数据模型

| 表 | 字段 | 说明 |
| --- | --- | --- |
| content | key、data | `profile` 对应个人资料 JSON |
| projects | id、data、position | 作品 JSON 与展示顺序 |
| sessions | token_hash、expires_at | 会话令牌哈希及有效期 |
| login_attempts | id、ip_hash、created_at | 短期失败登录计数 |

资料 JSON 包含 name、eyebrow、headline、intro、about、github、focus、location。作品 JSON 包含 title、category、description、tags、url、featured、theme。

## 5. 接口设计

| 方法 | 地址 | 权限 | 行为 |
| --- | --- | --- | --- |
| GET | `/api/profile` | 公开 | 读取资料与作品 |
| GET | `/api/auth/session` | 公开 | 返回是否已登录 |
| POST | `/api/auth/login` | 公开 | 校验密码，创建会话 |
| POST | `/api/auth/logout` | 同源 | 注销服务端会话 |
| PUT | `/api/admin/profile` | 已登录 | 校验并保存个人资料 |
| POST | `/api/admin/projects` | 已登录 | 新增作品 |
| PUT | `/api/admin/projects/:id` | 已登录 | 修改作品 |
| DELETE | `/api/admin/projects/:id` | 已登录 | 删除作品 |

返回 JSON，设置 `Cache-Control: no-store`。校验失败返回 400；未登录返回 401；来源不匹配返回 403；不存在返回 404；登录过频返回 429；部署配置缺失返回 503。

## 6. 安全设计

- 管理密码不写入前端和仓库。环境密钥 `ADMIN_PASSWORD_HASH` 保存 PBKDF2-SHA256 哈希，100,000 次迭代、随机盐、256 位派生值。
- 使用 256 位随机会话令牌；数据库只保存 SHA-256 哈希；8 小时过期。
- HTTPS 使用 `__Host-`、HttpOnly、Secure、SameSite=Strict Cookie；仅 localhost 开发例外。
- 所有修改请求要求 Origin 与当前网站完全一致，防止跨站写入。
- 相同来源 IP 连续 5 次失败后，15 分钟窗口内拒绝继续尝试；IP 以哈希形式短期保存。
- SQL 使用绑定参数；严格限制字符串长度、标签数量、JSON 请求体大小和 HTTPS 链接。
- React 文本渲染不执行资料中的 HTML；静态响应配置 CSP、拒绝页面嵌入和 MIME 嗅探。

## 7. 部署

### GitHub Pages

执行 `npm ci`、`npm run build:static`。发布 `dist-static/`。Vite 基础路径使用 `./`，兼容 GitHub 仓库子路径。该版本通过修改源码并重新发布更新内容。

### Cloudflare Pages

执行 `npm run build`。建立 D1 并填入真实 database_id；初始化 `schema.sql`；配置 DB 绑定和 `ADMIN_PASSWORD_HASH`；通过 Wrangler 或 Git 连接发布。Pages Functions 源目录保持与构建产物同级。

### 本地验证

先对本地 D1 执行初始化，再启动 `npm run dev:cloudflare`；或启用 Vite 4174 并把 API 代理到 8788。凭据仅放入忽略版本控制的 `.dev.vars`。

## 8. 验证

`npm test` 使用内存 SQLite 执行真实 schema 与 SQL。覆盖公开读取、未授权访问、跨站写入拦截、密码校验、Cookie 属性、资料持久化、作品增删改、会话退出和过期、失败登录限流，以及缺失配置的处理。

界面和部署截图由最终浏览器验收整理保存。每次发布后至少验证：公开 URL、登录、后台保存和前台刷新同步。

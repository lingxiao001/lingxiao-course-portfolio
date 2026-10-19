# Lingxiao 个人网站｜技术设计文档

版本：1.1 · 2026-10-19

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

### 前台视觉与交互

公开页面使用深色底 `#101211`、浅色正文 `#edeee7` 与荧光绿 `#d4f572`。`Portfolio` 负责分区导航、作品筛选、分类数量和移动导航；`ProjectArt` 根据既有作品 ID 选择预览。当前筛选结果中的第一张卡片使用突出布局，后续卡片在桌面以两列展示，手机改为单列。后台保留浅色表单，资料和作品仍由原有 API 保存。

轨道、字母装置和其他作品示意由 HTML/CSS 绘制，不新增图形运行时。`public/previews/workbench.png` 与 `reader.png` 是课间、拾页的真实运行截图，采用相对路径、延迟加载和替代文本；加载失败时隐藏截图，露出已有视觉预览。截图属于发布资产，未增加图片上传接口、数据库字段或图片存储绑定。既有 `featured` 与 `theme` 字段及后台编辑能力继续保留，首卡布局和截图选择由当前前端展示规则决定。

`IntersectionObserver` 控制内容进入视口时的渐显，并更新当前分区导航；指针事件仅修改装置倾斜的 CSS 变量。样式针对 1100、800、550 像素等宽度调整布局，窄屏使用可展开导航。系统满足 `prefers-reduced-motion: reduce` 时，停用动画、过渡、平滑滚动与装置变换，渐显内容直接显示。

键盘支持包含跳转作品列表的链接和可见焦点；筛选按钮使用 `aria-pressed`，导航按钮使用 `aria-expanded`，外链提供可读名称。后台保留错误提示、保存状态与禁用中的操作反馈。

## 3. 目录

- `src/`：公开页面、内容管理和样式。
- `src/data.js`：静态版初始公开资料。
- `public/previews/`：随静态资源发布的项目真实运行截图。
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

执行 `npm ci`、`npm run build:static`。现有仓库使用 `main:/docs` 分支目录发布，将 `dist-static/` 内容同步到 `docs/` 并保留 `.nojekyll` 后提交推送。Vite 基础路径使用 `./`，项目截图也使用相对地址，兼容 GitHub 仓库子路径。该版本通过修改源码并重新发布更新内容。

### Cloudflare Pages

现有项目 `lingxiao-course-portfolio` 使用直接上传，生产分支为 `main`。执行 `npm run build` 后运行 `npx wrangler pages deploy dist --project-name lingxiao-course-portfolio --branch main`。保留 `wrangler.jsonc` 中现有 D1 绑定与生产 `ADMIN_PASSWORD_HASH`，界面更新不执行数据库初始化或密钥重设。Pages Functions 源目录保持与构建产物同级，由 Wrangler 一起编译。

首次建立独立环境时才创建 D1、填入真实 database_id、执行 `schema.sql` 并配置 DB 与密码哈希；生产与预览环境分别使用对应绑定和密钥。数据库初始化使用不覆盖既有内容的语句，正式内容继续通过鉴权后台修改。

### 本地验证

先对本地 D1 执行初始化，再启动 `npm run dev:cloudflare`；或启用 Vite 4174 并把 API 代理到 8788。凭据仅放入忽略版本控制的 `.dev.vars`。

## 8. 验证

`npm test` 使用内存 SQLite 执行真实 schema 与 SQL。覆盖公开读取、未授权访问、跨站写入拦截、密码校验、Cookie 属性、资料持久化、作品增删改、会话退出和过期、失败登录限流，以及缺失配置的处理。

界面验收包括桌面与手机布局、移动导航、分类数量与筛选、截图与项目链接、键盘焦点，以及减少动效模式下内容始终可见。截图须来自实际运行，预览资产不能替代本次功能验证。

每次发布后至少验证：公开 URL、登录、后台保存和前台刷新同步，并通过独立公开请求确认持久化内容。界面与部署结果按实际操作整理留证，不以旧版截图作为新版验证结论。

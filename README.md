# Lingxiao · 个人作品与学习记录

同一份 React 源代码提供两个交付：考核三 GitHub Pages 静态官网；考核四 Cloudflare Pages＋D1 持久化个人网站。

## 本地运行

```sh
npm ci
npm run build
npx wrangler d1 execute lingxiao-portfolio --local --file=schema.sql
npm run dev:cloudflare
```

完整本地服务默认 `http://localhost:8788`。如果需要 Vite 热更新，另开终端执行 `npm run dev`，访问 `http://127.0.0.1:4174`，API 代理到 8788。

后台为网站地址后加 `#admin`。本地管理员哈希配置在 `.dev.vars`，不提交版本控制。生成哈希时通过标准输入传入密码：运行 `npm run password:hash` 后输入至少 12 位密码并结束输入，把输出值配置为 `ADMIN_PASSWORD_HASH`。不要把密码写到命令行参数。

## 发布 GitHub Pages（考核三）

```sh
npm run build:static
```

把 `dist-static/` 发布到 GitHub Pages。所有资源地址为相对路径，支持仓库目录下托管。静态版不显示管理入口，不依赖服务端或数据库。

保留：源码推送成功截图、GitHub Pages 部署成功截图、公开页面截图及公开网址。

## 发布 Cloudflare Pages（考核四）

1. 创建 D1 数据库 `lingxiao-portfolio`，将真实 ID 写入 `wrangler.jsonc`。
2. 执行 `npx wrangler d1 execute lingxiao-portfolio --remote --file=schema.sql`。
3. 使用 `npm run build` 构建到 `dist/`。
4. 创建 Pages 项目，在项目设置中绑定 D1，变量名为 `DB`。
5. 通过 Cloudflare 密钥设置或 `wrangler pages secret put ADMIN_PASSWORD_HASH --project-name <项目名>` 设置密码哈希；不得把原始密码上传到环境中。
6. 使用 `npx wrangler pages deploy dist --project-name <项目名>` 发布。`functions/` 保持在项目根目录，以便 Wrangler 一起编译。
7. 打开公开网址，进入 `#admin` 登录，修改资料并保存，回到前台刷新确认同步。

密钥应配置到生产环境；使用预览部署时，需要同时配置对应预览环境的 DB 和密钥。

## 验收

```sh
npm test
npm run build
npm run build:static
```

9 项接口与安全测试覆盖真实 SQL 存取、登录退出、资料及作品持久化、权限、会话过期与登录限流。

后台使用流程：登录 → 个人资料 → 修改状态或简介 → 保存 → 查看前台。作品管理支持新增、编辑、删除、分类与主题配色。所有写入需通过登录鉴权及同源验证。

## 文档与留证

- `PRD.md`：产品需求和验收项。
- `TECH_DESIN.md`：课程问卷拼写的技术设计。
- `TECH_DESIGN.md`：标准拼写副本。
- `AGENTS.md`：项目协作与安全规则。
- `tests/api.test.js`：可重复运行的接口验证。

公开初始资料未包含未经证实的个人经历。作品链接连接到课程工具的公开 Pages 网址、代码仓库与阅读器发布页；后续可在后台编辑。网页文本工具使用本地关键词和重点句提取，不宣称接入远程 AI 总结。

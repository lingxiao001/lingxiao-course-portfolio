# Lingxiao · 个人作品与学习记录

同一份 React 源代码提供两个交付：考核三 GitHub Pages 静态官网；考核四 Cloudflare Pages＋D1 持久化个人网站。

## 2026-10-19 界面更新

公开前台采用深色背景与荧光绿强调色，以大标题、轨道字母装置、作品预览和分区编号组织个人介绍、作品集、关于与构建笔记。首页装置支持指针轻微倾斜，作品和内容区在进入视口时渐显；系统开启“减少动态效果”后，页面停用动画、过渡与平滑滚动，并直接显示内容。

- 作品按全部、网页应用、桌面应用筛选，同时显示各分类数量；当前结果中的首张卡片采用更大的展示布局。
- 课间与拾页使用 `public/previews/workbench.png`、`public/previews/reader.png` 中的真实运行截图，随静态资源一起发布。截图延迟加载，加载失败时保留项目视觉预览；其他作品使用代码绘制的示意图，不将示意图当作运行留证。
- 桌面采用双列作品布局，手机改为单列并提供可展开导航。页面包含“跳到作品列表”、键盘焦点样式，以及筛选和导航状态的辅助技术标记。
- 动态版继续从 `/api/profile` 读取 D1 内容；登录、资料编辑与作品增删改保持原有服务端鉴权。后台使用浅色编辑界面，方便填写和核对资料。

运行截图由项目静态资源维护，后台目前不提供截图上传。此次界面更新不要求修改数据库结构、重新初始化生产资料或重设管理员密码。

## 已发布网址（2026-10-17 已核验）

- 考核三 · GitHub Pages 静态官网：https://lingxiao001.github.io/lingxiao-course-portfolio/
- 考核四 · Cloudflare Pages 动态官网：https://lingxiao-course-portfolio.pages.dev/
- 内容管理入口：https://lingxiao-course-portfolio.pages.dev/#admin
- 完整源代码：https://github.com/lingxiao001/lingxiao-course-portfolio
- 阅读器 v2.1.0 发布页：https://github.com/lingxiao001/lingxiao-course-portfolio/releases/tag/reader-v2.1.0

生产环境已连接 D1 数据库 `lingxiao-portfolio`，绑定名 `DB`；公开接口实际返回 1 份个人资料和 5 个作品。独立未登录请求不能修改资料（HTTP 401）。具体配置与验收记录见 `DEPLOYMENT.md` 和 `verification-production.json`。

管理员凭据仅在本机交付：本目录 `.local-admin.secret` 保存管理员密码，`.dev.vars` 保存加盐哈希。两者均已忽略版本控制，不打包到公开源码、不放入截图。生产环境只使用 `ADMIN_PASSWORD_HASH` 密钥。

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

现有 GitHub Pages 从 `main` 分支的 `/docs` 目录发布：将 `dist-static/` 的内容同步到 `docs/`，保留 `docs/.nojekyll`，提交并推送后等待 Pages 构建。所有资源和预览截图地址为相对路径，支持仓库目录下托管。静态版不显示管理入口，不依赖服务端或数据库。

保留：源码推送成功截图、GitHub Pages 部署成功截图、公开页面截图及公开网址。

## 发布 Cloudflare Pages（考核四）

现有生产项目已完成数据库与密钥配置。后续界面更新使用以下命令，保留当前 `wrangler.jsonc` 中的 `DB` 绑定及已有生产密钥：

```sh
npm run build
npx wrangler pages deploy dist --project-name lingxiao-course-portfolio --branch main
```

已有项目更新无需重新执行建库、初始化或密钥设置。下面是首次配置新环境的流程：

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

界面验收应分别检查桌面与手机布局、导航展开、三种作品筛选、截图加载、项目链接和键盘操作，并在系统减少动效模式下确认内容始终可见。动态版还需复核登录、后台保存和独立刷新后的内容同步；运行记录与截图应来自实际操作。

后台使用流程：登录 → 个人资料 → 修改状态或简介 → 保存 → 查看前台。作品管理支持新增、编辑、删除、分类与主题配色。所有写入需通过登录鉴权及同源验证。

## 文档与留证

- `PRD.md`：产品需求和验收项。
- `TECH_DESIN.md`：课程问卷拼写的技术设计。
- `TECH_DESIGN.md`：标准拼写副本。
- `AGENTS.md`：项目协作与安全规则。
- `tests/api.test.js`：可重复运行的接口验证。

公开初始资料未包含未经证实的个人经历。作品链接连接到课程工具的公开 Pages 网址、代码仓库与阅读器发布页；后续可在后台编辑。网页文本工具使用本地关键词和重点句提取，不宣称接入远程 AI 总结。

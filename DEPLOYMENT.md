# 已部署服务与验收记录

记录日期：2026-10-17（北京时间）。本文件记录真实发布结果，不包含密码、会话 Cookie 或 API Key。

## 1. 公开网址

| 交付 | 公开网址 | 独立 HTTP 核验 |
| --- | --- | --- |
| 考核三：GitHub Pages 静态官网 | https://lingxiao001.github.io/lingxiao-course-portfolio/ | 200 |
| 考核四：Cloudflare Pages 动态官网 | https://lingxiao-course-portfolio.pages.dev/ | 200 |
| 课程源代码仓库 | https://github.com/lingxiao001/lingxiao-course-portfolio | 200 |
| 阅读器 v2.0.0 发布页 | https://github.com/lingxiao001/lingxiao-course-portfolio/releases/tag/reader-v2.0.0 | 200 |
| 课间 · 学习文本工作台 | https://lingxiao-study-workspace.pages.dev/ | 200 |
| 专注一刻 · 学习计时器 | https://lingxiao-focus-room.pages.dev/ | 200 |
| 学分有数 · 成绩目标规划 | https://lingxiao-grade-planner.pages.dev/ | 200 |

后台入口：https://lingxiao-course-portfolio.pages.dev/#admin

## 2. 生产配置

- Cloudflare Pages 项目：`lingxiao-course-portfolio`。
- 构建产物：`dist/`；API 由同目录工程中的 `functions/` 编译。
- D1 绑定变量：`DB`。
- D1 数据库名称：`lingxiao-portfolio`。
- D1 数据库 ID：`fb62475d-981b-49ca-849b-22ca767acd1c`。
- 数据库已通过真实 Cloudflare 管理界面执行 `schema.sql` 初始化。
- 初始化结果：1 份 profile、5 个 projects。
- 生产密钥名称：`ADMIN_PASSWORD_HASH`，通过安全标准输入配置；此文件不记录密钥值。
- 当前生产数据库 ID 与项目配置见 `wrangler.jsonc`。

GitHub Pages 使用 `dist-static/` 构建结果。静态版不调用后台；其网址在仓库路径下使用相对资源地址，已实际访问验证。

## 3. 独立生产接口核验

核验时间：2026-10-17 22:21（北京时间）。没有携带管理员 Cookie，没有修改生产资料。

| 检查 | 实际响应 | 验证内容 |
| --- | --- | --- |
| `GET /` | 200 | 返回 Lingxiao 个人网站 HTML |
| `GET /api/profile` | 200 | 真实返回 Lingxiao 资料与 5 个项目；`Cache-Control: no-store` |
| `GET /api/auth/session` | 200 | 独立未登录会话返回 `authenticated: false` |
| 无会话 `PUT /api/admin/profile`，空 JSON，同源 Origin | 401 | 返回「请先登录」；写入被鉴权拒绝，未修改资料 |

原始独立接口记录见 `verification-production.json`。主任务随后已通过真实生产浏览器验收：管理员成功登录、编辑个人资料、保存到数据库并验证前台同步。相关实际截图保存在 `screenshots/04-线上后台修改并保存.jpg` 与 `screenshots/04-Cloudflare线上前台.jpg`；静态发布和源码推送截图也在 `screenshots/`。

## 4. 本地凭据交付

管理员密码只保存在当前电脑的项目目录 `.local-admin.secret`；对应哈希在 `.dev.vars`。两个文件权限为仅当前用户可读写，且被 `.gitignore` 排除。

位置：`coursework/03-personal-site/.local-admin.secret`（相对于本课程本地工作目录）。不要把此文件上传问卷、推送 GitHub、打进公开源码包或放入截图。公开交付中只保留文件位置说明；真实密码不出现在本文档。

若要更换生产密码，使用 `scripts/hash-password.mjs` 从标准输入生成新哈希，再更新 Cloudflare Pages 生产密钥 `ADMIN_PASSWORD_HASH` 并重新部署。不要通过命令行参数或提交文件传递明文密码。

## 5. 可重复构建与检查

```sh
npm ci
npm test
npm run build
npm run build:static
```

本次 9 项 API / SQL / 权限测试全部通过。真实测试、构建及本地运行记录分别保存在 `verification-tests.txt`、`verification-build.txt`、`verification-static-build.txt`、`verification-runtime.txt`。

重新初始化已有数据库时，`schema.sql` 使用 `CREATE IF NOT EXISTS` 和 `INSERT OR IGNORE`，避免覆盖已有个人资料。正式内容修改通过后台完成。

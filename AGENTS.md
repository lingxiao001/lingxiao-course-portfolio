# 项目协作规则

本项目是 Lingxiao 的个人作品与学习记录网站，用于课程考核三、四。

## 目标与内容

- 保持个人介绍、作品展示、学习记录、GitHub 联系和内容管理完整可用。
- 只使用用户提供或可以验证的个人信息；不得虚构经历、客户、奖项、用户量或成功截图。
- 未提供的项目网址允许留空，不添加虚假链接。
- 前台修改必须与 PRD 一致，后台保存必须进入 D1 并可被独立读取。

## 技术约定

- 前端 React＋Vite，界面文案使用简体中文。
- 动态接口集中在 `server/api.js`，Pages Functions 入口保持简洁。
- 数据库使用 DB 绑定与参数化 SQL；数据库迁移保留已有资料。
- `build:static` 必须能独立部署到 GitHub Pages；动态构建部署到 Cloudflare Pages。
- 使用相对资源路径以兼容 GitHub 仓库子路径。

## 安全与密钥

- 不提交密码、API Key、Cookie、`.dev.vars`、`.env`、本地数据库和任何 `.secret` 文件。
- 管理密码只保存随机加盐哈希；生产 Cookie 必须 HttpOnly、Secure、SameSite=Strict。
- 所有管理员写入都需要有效服务端会话与同源检查。
- 保留输入校验、HTTPS 链接限制、失败登录限流和输出安全头。
- 生成截图前遮挡秘密信息，截图必须来自真实操作。

## 交付检查

1. 相关功能变更后运行 `npm test`。
2. 运行 `npm run build` 和 `npm run build:static`。
3. 检查手机及桌面布局、作品筛选、登录和后台保存。
4. 更新 PRD、TECH_DESIN、README，使文档与实际功能一致。
5. 保留源代码、部署结果和实际验收记录，便于课程复核。

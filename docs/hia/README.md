# js-cookie 文档化工程学习入口

本目录解释 HIA 文档化工程版 js-cookie 的代码结构、Cookie 行为边界与可复现文档链。运行时仍以
[js-cookie `v3.0.8`](../../UPSTREAM.md) 为冻结上游基线；本轮只给 `index.js`、`src/api.mjs`、`src/assign.mjs` 和
`src/converter.mjs` 增加中英双语 ROP/JSDoc，没有改变 package exports、依赖、测试或构建配置。

This directory is the learning entry point for the HIA documentation-engineering edition of js-cookie. Runtime behavior remains based
on the frozen js-cookie `v3.0.8` source. The documentation overlay covers four core files only and does not change package exports,
dependencies, tests, or build configuration.

## 推荐阅读顺序

1. [架构与调用链](architecture.md)：从 CommonJS/ES module 入口进入 API factory、converter 与属性合并；
2. [Cookie 行为与安全边界](cookie-boundaries.md)：理解 `document.cookie`、编码、expires、作用域和 HttpOnly 限制；
3. 源码中的 `@lang` / `<lang>` 节点注释和流程注释：把文档主题对应到实际语句；
4. [本地文档工具](../../tools/hia-docs/README.md)：生成并比较三条输出链、三种源码模式和三套皮肤。

## 展示矩阵

公开入口位于 `build/hia-docs/showcase/index.html`，按以下三个维度展开：

- 输出链：直接 JPHS/JTH、hia-jsdoc（独立输出 + Portal bridge）、统一 Portal；
- 源码阅读：`fetch`、`embed`、`link`；
- 皮肤：`classic`、`graphite`、`lumen`。

三个维度形成 27 个配置 profile；hia-jsdoc 每项同时提供两个 surface，因此共 36 个可浏览 surface。所有 profile 都采用
multi-page，默认入口是 `unified-portal.fetch.classic`。fetch 使用同源、内容寻址并带 SHA-384 完整性信息的文本资产，展开
源码卡片时才加载；embed 把正文放在 topic HTML；link 提供同源文本链接。`none` 不进入展示矩阵，只作为独立隐私回归。
生成目录被 Git 忽略，不是上游分发文件的一部分。

The public entry is `build/hia-docs/showcase/index.html`. Three pipelines, three source-reading modes, and three skins form 27
configuration profiles. hia-jsdoc exposes both standalone and Portal-bridge surfaces, producing 36 browsable surfaces in total. Every
profile is multi-page; unified Portal with fetch and classic skin is the default. Fetch uses same-origin, content-addressed,
SHA-384-described text assets and loads on expansion; embed carries source only in topic HTML; link exposes a same-origin text link.

## 阅读时应保留的边界

- `document.cookie` 只能看到当前 document 可访问的 Cookie，不能读取或创建 HttpOnly Cookie；
- Cookie 是否最终写入由浏览器结合 domain、path、secure context、SameSite 等策略决定；
- getter 对单个畸形百分号编码做隔离，不表示数据一定可信或适合直接进入 HTML/SQL 等下游；
- `assign` 为保持上游兼容性会复制 `for...in` 可见的继承枚举键，仅显式拒绝 `__proto__`；
- 本轮是首个 changed-scope ROP pilot，不代表整个上游仓库的历史注释债务已经清零。

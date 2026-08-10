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
4. [本地文档工具](../../tools/hia-docs/README.md)：分别生成独立 JSDoc 与统一 Portal 输出。

## 两类输出

| 输出       | 目录                           | 用途                                                     |
| ---------- | ------------------------------ | -------------------------------------------------------- |
| 独立 JSDoc | `build/hia-docs/jsdoc-native/` | 查看库自身节点、参数、层级、locale 与源码链接            |
| HIA Portal | `build/hia-docs/portal/`       | 验证同一 integration artifact 可被统一 HIA renderer 消费 |

两类输出分别生成和检查，不能用一方成功替代另一方。它们都使用 link-only source presentation：源码正文不嵌入、不通过
浏览器 fetch，链接固定到构建时的 Git commit。生成目录被 Git 忽略，不是上游分发文件的一部分。

## 阅读时应保留的边界

- `document.cookie` 只能看到当前 document 可访问的 Cookie，不能读取或创建 HttpOnly Cookie；
- Cookie 是否最终写入由浏览器结合 domain、path、secure context、SameSite 等策略决定；
- getter 对单个畸形百分号编码做隔离，不表示数据一定可信或适合直接进入 HTML/SQL 等下游；
- `assign` 为保持上游兼容性会复制 `for...in` 可见的继承枚举键，仅显式拒绝 `__proto__`；
- 本轮是首个 changed-scope ROP pilot，不代表整个上游仓库的历史注释债务已经清零。

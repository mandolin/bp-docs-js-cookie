# Cookie 行为与安全边界 / Cookie Behavior and Security Boundaries

## 浏览器 API 边界

js-cookie 包装的是浏览器 `document.cookie` 字符串 API。它能创建或读取的只是当前文档可访问的 Cookie；`HttpOnly` 设计为
阻止 JavaScript 读取，因此不属于该 API 的能力面。服务端的 `Set-Cookie`、跨请求策略与凭据保护也不由该库替代。

js-cookie wraps the browser `document.cookie` string API. It can create or read only Cookies available to the current document.
HttpOnly intentionally prevents JavaScript access and is therefore outside this API surface. Server-side `Set-Cookie`, request policy,
and credential protection remain separate responsibilities.

## 属性不是读取筛选器

`path`、`domain`、`secure`、`sameSite` 和 `expires` 影响浏览器是否存储或向当前 document 暴露 Cookie，但 getter 不接受这些
属性作为查询条件。删除 Cookie 时通常必须提供与创建时一致的 path/domain；否则过期写入可能作用于另一个 scope。

`expires` 的数字输入单位是天。实现以 `Date.now() + days * 864e5` 计算绝对时间；这不是按日历日、当地午夜或业务时区计算。
Date/string 等 truthy 输入沿用当前 `toUTCString()` 调用契约，调用方应传入符合该契约的值。

## 编码与容错

- 名称和值分别编码，converter 只负责值；
- 读侧只解码连续 `%HH` 序列，畸形编码可抛出 `URIError`；
- getter 在单个 Cookie 粒度捕获该错误，不记录错误或 Cookie 内容；
- 值可包含等号，因为读取时只把第一个等号视为 name/value 分界；
- 属性值在首个分号处截断，不能借一个属性值追加后续属性。

Custom converters can change value semantics. A converter should be deterministic, avoid logging Cookie data, and document whether it
throws. Deriving a converter with `withConverter()` performs a shallow enumerable merge; it is not a sandbox for untrusted code.

## 示例与隐私

公开学习材料应使用合成名称和值，不应复制真实 session identifier、authentication token、用户标识、生产 domain 或内部
路径。对 JSDoc/流程 handoff metadata 而言，`sourceContentPolicy: none` 表示这些 metadata 不携带 raw source body；它本身不决定
Portal 页面的 source presentation mode。

本仓公开 Pages 默认使用 Portal `fetch` mode：展开源码阅读区时，页面按需读取同源、内容寻址且经过摘要校验的文本资产。该文本
不会内嵌进 JSDoc metadata、navigation/search index 或 handoff metadata。若某个输出必须完全不请求源码文本，应为该输出显式选择
Portal `none` mode；两种策略及各自承载位置见 [文档工具说明](../../tools/hia-docs/README.md#source-presentation-modes)。

For JSDoc or flow-handoff metadata, `sourceContentPolicy: none` means those metadata do not carry raw source bodies; it does not select
the Portal page's source presentation mode.

This repository's public Pages site uses Portal `fetch` mode by default. Expanding a source-reading panel requests a same-origin,
content-addressed text asset whose digest is verified. The text is not embedded in JSDoc metadata, navigation/search indexes, or
handoff metadata. Select Portal `none` explicitly when an output must make no request for source text. See the [documentation tooling
guide](../../tools/hia-docs/README.md#source-presentation-modes) for the distinct policies and carriers.

## 规范状态

[RFC 6265](https://www.rfc-editor.org/info/rfc6265) 是本基线采用的已发布 Cookie 规范参考。6265bis 在本文档化工程实施时仍处于
标准化流程中；现代浏览器策略可能继续演进，因此部署决策应同时核对目标浏览器的当前正式文档，而不把本示例当作浏览器
安全策略的静态替代品。

# HIA 文档工程展示工具 / HIA Documentation Showcase Tooling

本目录在不修改 root `package.json`、`package-lock.json` 或上游 script 的前提下，为 js-cookie 生成并验收可复现的文档工程
本地/CI 展示矩阵，并从其中物化唯一的公开默认 Portal 产品。源码输入严格限制为 `index.js` 与三个 `src/*.mjs`，不会递归吸入
tests、examples、dist 或 workflow。

This directory builds and validates a reproducible documentation-engineering showcase for js-cookie without changing the root package
manifest, lockfile, or upstream scripts. Its source allowlist contains `index.js` and the three `src/*.mjs` files only.

## Workspace topology

The local pipeline expects the sibling layout used by HIA-Documentation-Sys:

```text
HIA-Documentation-Sys/
├─ BP/bp-docs-js-cookie/
├─ HIA/jsdoc-plugin-hia-sys/
├─ HIA/jsdoc-theme-hia/
├─ HIA/hia-jsdoc/
└─ main-repo/
```

Owner repositories must be clean and remain at these full commits:

| Owner                            | Commit                                     | License           |
| -------------------------------- | ------------------------------------------ | ----------------- |
| `@mandolin/jsdoc-plugin-hia-sys` | `15970dc9da0f8e120677eab7eba3e959dcf42a34` | MIT               |
| `@mandolin/jsdoc-theme-hia`      | `0df2ca9bbf40e159d8da69aac80b3c31136b1a05` | MIT               |
| `hia-jsdoc` umbrella             | `4890e0bf1b943a14cf247f9b413d140a43a6bb5b` | MIT               |
| HIA main Portal/CLI              | `b13203038ebcad604904575a70055d89d6027c50` | MIT package train |

JSDoc `4.0.5` is Apache-2.0 and is isolated under `runtime/package-lock.json`. PrismJS `1.30.0` is MIT and is isolated in the same private
tooling runtime solely to highlight already fetched, byte-counted and SHA-384-verified JavaScript source. The public artifact receives
only Prism's browser runtime, line-number helper and license; it never executes documented source, loads no CDN resource and keeps plain
text as the failure fallback. hia-jsdoc uses its own workspace lock. None of these tools is added to the js-cookie root package, and the
pipeline does not copy owner theme implementations into this repository.

## Matrix and defaults

The generated site combines three closed dimensions:

| Dimension         | Values                                     |
| ----------------- | ------------------------------------------ |
| Output pipeline   | direct JPHS/JTH, hia-jsdoc, unified Portal |
| Source reading    | `fetch`, `embed`, `link`                   |
| Skin              | `classic`, `graphite`, `lumen`             |
| Page partitioning | `multi-page` for every profile             |

The Cartesian product contains 27 local/CI configuration profiles. Each hia-jsdoc profile proves both a standalone surface and a Portal
bridge, so the local hub exposes 36 browsable surfaces. `unified-portal.fetch.classic` is the only public profile. The `none` source mode
remains a separate fail-closed privacy regression and is intentionally excluded from both artifact families.

## Install and run

Node `24.22.1` and pnpm `10.34.4` are the default tools in `mise.toml`; Node `22.23.4` is the second required documentation runtime.
Node 20 remains an upstream-reproduction slot and is not a documentation-tool support promise.

Install the two isolated npm workspaces once. Install the Portal owner through its own frozen pnpm lock when that workspace is not
already ready:

```bash
mise exec node@24.22.1 -- npm ci --ignore-scripts --no-audit --no-fund --prefix tools/hia-docs/runtime
mise exec node@24.22.1 -- npm --prefix ../../HIA/hia-jsdoc run prepare:owners
mise exec node@24.22.1 -- npm ci --ignore-scripts --no-audit --no-fund --prefix ../../HIA/hia-jsdoc
mise exec node@24.22.1 pnpm@10.34.4 -- pnpm --dir ../../main-repo install --frozen-lockfile
```

Build and run the local gates:

```bash
mise exec node@24.22.1 -- node tools/hia-docs/build.mjs
mise exec node@24.22.1 -- node --test tools/hia-docs/showcase.test.mjs
mise exec node@24.22.1 -- node --test tools/hia-docs/public-artifact.test.mjs
mise exec node@24.22.1 -- node --test tools/hia-docs/sanitize.test.mjs
mise exec node@24.22.1 -- node tools/hia-docs/check.mjs
mise exec node@24.22.1 -- node tools/hia-docs/check-pages.mjs
```

The Pages workflow builds once with Node `22.23.4`, stages body-free fingerprints for both artifact families, rebuilds with Node
`24.22.1`, and runs `check-determinism.mjs`. Only a byte-identical Node 24 public result becomes the upload artifact.

## Outputs and privacy

All generated files remain ignored under `build/hia-docs/`:

- `showcase/index.html`: no-script-capable profile hub;
- `showcase/showcase-matrix.json`: public-safe 27-profile manifest;
- `showcase/profiles/`: all 36 owner-rendered surfaces;
- `public/`: chooser-free default `unified-portal.fetch.classic` Pages artifact with its publication manifest and BP product shell;
- `public/guides/first-party-preferences/`: an additive bilingual static guide route for visitor language/theme preferences; baseline B still governs the existing landing/API Portal, and the guide's owner-authorized examples remain illustrative rather than verified production settings;
  新增的双语静态指南 route 只覆盖访客语言/主题偏好流程；baseline B 继续管理现有首页/API Portal，负责人授权的示例仍是说明模型而非已核实的生产设置。
- `evidence/`: counts, booleans, versions, aggregate hashes and statuses without source bodies;
- `cache/`: execution-only configs and raw handoffs, deleted after every successful or failed build.

### Source presentation modes

The source presentation modes have distinct carriers:

The body-free handoff retains the same authorized file's high-confidence parser range before removing `primaryBlock` and preview
bodies. A declaration anchor alone is not widened to guessed surrounding code. Separate source-line HTML pages are inventoried
source assets with no-execution CSP, paired with their content-addressed text assets; they are not embedded API document bodies.

清洗器删除正文前保留同一授权文件的高置信解析范围，不把声明锚点扩为猜测代码。独立源码行号HTML页属于登记过的源码资产，
须关联正文摘要资产并禁止脚本执行；API正文、导航、搜索及handoff JSON仍保持各自隐私边界。

- `fetch` is the default: topic HTML contains only same-origin asset metadata; source text is content-addressed, size-bounded,
  SHA-384-described, credential-free, and loaded when the reader expands;
- `embed` places approved source text only in topic HTML, never in the hub, index JSON, navigation JSON or search JSON;
- `link` emits a same-origin content-addressed text asset and a normal link, avoiding repeated navigation to a floating branch;
- `none` disables source presentation, preview and public assets in the separate privacy test.

These Portal modes control how a rendered page presents or requests source text. They are separate from `sourceContentPolicy` on
JSDoc or flow-handoff metadata, which controls whether those metadata carry source bodies. In particular, `sourceContentPolicy: none`
does not make a Portal `fetch` page request-free; this repository's public Pages artifact uses `fetch` on reader expansion. The metadata
still omit source bodies from navigation, search and handoff carriers.

这些 Portal mode 控制渲染页面如何呈现或请求源码文本；它们与 JSDoc/flow-handoff metadata 上控制是否携带源码正文的
`sourceContentPolicy` 相互独立。`sourceContentPolicy: none` 不会让 Portal `fetch` 页面停止按需请求；本仓公开 Pages artifact
在读者展开源码区时使用 `fetch`。导航、搜索和 handoff metadata 仍不承载源码正文。

Public JSON is sanitized for raw comments, source-body carriers and host absolute paths. Temporary hia-jsdoc configs, raw integrations,
credentials, analytics, telemetry and target-project data are excluded. Source/skin variants must preserve topic, page, fragment,
navigation and relation identities.

## GitHub Pages and browser review

The workflow uploads only `build/hia-docs/public/` to
[`https://mandolin.github.io/bp-docs-js-cookie/`](https://mandolin.github.io/bp-docs-js-cookie/). Owner checkouts and GitHub actions are
pinned by full commit, checkout credentials are discarded, no generated branch is committed, and the deploy job alone receives
`pages: write` plus `id-token: write`. The local 27-profile hub and its other 35 surfaces never enter the Pages artifact.

Serve the ignored public artifact locally on loopback:

```bash
mise exec node@24.22.1 -- node tools/hia-docs/serve.mjs 4179
```

Open `http://127.0.0.1:4179/bp-docs-js-cookie/`. The server maps directory routes only to their own `index.html` and rejects traversal,
symbolic links, directory listings, writes, and non-loopback binding. After a deployment, run the anonymous same-origin online gate:

```bash
mise exec node@24.22.1 -- node tools/hia-docs/check-pages-online.mjs
```

For local matrix debugging only, pass the explicit third argument `showcase`:

```bash
mise exec node@24.22.1 -- node tools/hia-docs/serve.mjs 4179 showcase
```

## Scope and rollback

The tooling refuses changes outside the frozen documentation paths and refuses root package/lock drift. It recursively rebuilds only the
exact ignored `build/hia-docs/` boundary after resolving that path inside the BP repository. Removing the ignored directory rolls back
local generated output; reverting the focused documentation commit removes the authored tooling without rewriting upstream history.

The local commands do not enable Pages, publish packages, use BrowserStack, read credentials, or access target projects. Only the
reviewed Pages workflow deploys the already-validated default Portal artifact.

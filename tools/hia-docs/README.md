# HIA 文档工程展示工具 / HIA Documentation Showcase Tooling

本目录在不修改 root `package.json`、`package-lock.json` 或上游 script 的前提下，为 js-cookie 生成并验收可复现的文档工程
展示矩阵。源码输入严格限制为 `index.js` 与三个 `src/*.mjs`，不会递归吸入 tests、examples、dist 或 workflow。

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
| `@mandolin/jsdoc-plugin-hia-sys` | `ac1fa5831dd33c204dd2168eed812b654eab24e4` | MIT               |
| `@mandolin/jsdoc-theme-hia`      | `9c78b017567c5c23a212ae572e72ad36376ed78d` | MIT               |
| `hia-jsdoc` umbrella             | `8f246729a9bec72baafab0b7699a14536ae23d29` | MIT               |
| HIA main Portal/CLI              | `1bbb072585303c875093f5dd3555aeb3353e5efd` | MIT package train |

JSDoc `4.0.5` is Apache-2.0 and is isolated under `runtime/package-lock.json`. hia-jsdoc uses its own workspace lock. Neither runtime is
added to the js-cookie root package, and the pipeline does not copy owner theme implementations into this repository.

## Matrix and defaults

The generated site combines three closed dimensions:

| Dimension         | Values                                     |
| ----------------- | ------------------------------------------ |
| Output pipeline   | direct JPHS/JTH, hia-jsdoc, unified Portal |
| Source reading    | `fetch`, `embed`, `link`                   |
| Skin              | `classic`, `graphite`, `lumen`             |
| Page partitioning | `multi-page` for every profile             |

The Cartesian product contains 27 configuration profiles. Each hia-jsdoc profile proves both a standalone surface and a Portal bridge,
so the hub exposes 36 browsable surfaces. `unified-portal.fetch.classic` is the default. The `none` source mode remains a separate
fail-closed privacy regression and is intentionally excluded from the public matrix.

## Install and run

Node `24.12.0` and pnpm `10.34.4` are the default tools in `mise.toml`; Node `22.23.0` is the second required documentation runtime.
Node 20 remains an upstream-reproduction slot and is not a documentation-tool support promise.

Install the two isolated npm workspaces once. Install the Portal owner through its own frozen pnpm lock when that workspace is not
already ready:

```bash
mise exec node@24.12.0 -- npm ci --ignore-scripts --no-audit --no-fund --prefix tools/hia-docs/runtime
mise exec node@24.12.0 -- npm ci --ignore-scripts --no-audit --no-fund --prefix ../../HIA/hia-jsdoc
mise exec node@24.12.0 pnpm@10.34.4 -- pnpm --dir ../../main-repo install --frozen-lockfile
```

Build and run the local gates:

```bash
mise exec node@24.12.0 -- node tools/hia-docs/build.mjs
mise exec node@24.12.0 -- node --test tools/hia-docs/showcase.test.mjs
mise exec node@24.12.0 -- node tools/hia-docs/check.mjs
mise exec node@24.12.0 -- node tools/hia-docs/check-pages.mjs
```

The Pages workflow builds once with Node `22.23.0`, stages the body-free aggregate fingerprint, rebuilds with Node `24.12.0`, and runs
`check-determinism.mjs`. Only a byte-identical Node 24 result becomes the upload artifact.

## Outputs and privacy

All generated files remain ignored under `build/hia-docs/`:

- `showcase/index.html`: no-script-capable profile hub;
- `showcase/showcase-matrix.json`: public-safe 27-profile manifest;
- `showcase/profiles/`: all 36 owner-rendered surfaces;
- `evidence/`: counts, booleans, versions, aggregate hashes and statuses without source bodies;
- `cache/`: execution-only configs and raw handoffs, deleted after every successful or failed build.

The source presentation modes have distinct carriers:

- `fetch` is the default: topic HTML contains only same-origin asset metadata; source text is content-addressed, size-bounded,
  SHA-384-described, credential-free, and loaded when the reader expands;
- `embed` places approved source text only in topic HTML, never in the hub, index JSON, navigation JSON or search JSON;
- `link` emits a same-origin content-addressed text asset and a normal link, avoiding repeated navigation to a floating branch;
- `none` disables source presentation, preview and public assets in the separate privacy test.

Public JSON is sanitized for raw comments, source-body carriers and host absolute paths. Temporary hia-jsdoc configs, raw integrations,
credentials, analytics, telemetry and target-project data are excluded. Source/skin variants must preserve topic, page, fragment,
navigation and relation identities.

## GitHub Pages and browser review

The workflow uploads only `build/hia-docs/showcase/` to
[`https://mandolin.github.io/bp-docs-js-cookie/`](https://mandolin.github.io/bp-docs-js-cookie/). Owner checkouts and GitHub actions are
pinned by full commit, checkout credentials are discarded, no generated branch is committed, and the deploy job alone receives
`pages: write` plus `id-token: write`.

Serve the ignored showcase locally on loopback:

```bash
mise exec node@24.12.0 -- node tools/hia-docs/serve.mjs 4179
```

Open `http://127.0.0.1:4179/bp-docs-js-cookie/`. The server maps directory routes only to their own `index.html` and rejects traversal,
symbolic links, directory listings, writes, and non-loopback binding. After a deployment, run the anonymous same-origin online gate:

```bash
mise exec node@24.12.0 -- node tools/hia-docs/check-pages-online.mjs
```

## Scope and rollback

The tooling refuses changes outside the frozen documentation paths and refuses root package/lock drift. It recursively rebuilds only the
exact ignored `build/hia-docs/` boundary after resolving that path inside the BP repository. Removing the ignored directory rolls back
local generated output; reverting the focused documentation commit removes the authored tooling without rewriting upstream history.

The local commands do not enable Pages, publish packages, use BrowserStack, read credentials, or access target projects. Only the
reviewed Pages workflow deploys the already-validated showcase artifact.

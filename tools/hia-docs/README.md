# HIA 本地文档工具 / HIA Local Documentation Tooling

本目录在不修改 root `package.json`、`package-lock.json` 或上游 script 的前提下，生成并检查 js-cookie 的两类本地文档输出。
工具只解析 `index.js` 与三个 `src/*.mjs`，不会递归吸入 tests、examples、dist 或 workflow。

This directory generates and checks two local documentation outputs without modifying the root package manifest, lockfile, or upstream
scripts. The source allowlist contains `index.js` and the three `src/*.mjs` files only.

## Workspace topology

The pipeline expects the repository layout used by HIA-Documentation-Sys:

```text
HIA-Documentation-Sys/
├─ BP/bp-docs-js-cookie/
├─ HIA/jsdoc-plugin-hia-sys/
├─ HIA/jsdoc-theme-hia/
└─ main-repo/
```

Sibling owners are accepted only at these exact, clean commits:

| Owner                            | Commit                                     | License           |
| -------------------------------- | ------------------------------------------ | ----------------- |
| `@mandolin/jsdoc-plugin-hia-sys` | `3cdd56469044bf40881cf88c4905110ad656ab13` | MIT               |
| `@mandolin/jsdoc-theme-hia`      | `e2e85fb23ad9274b730c84c24af9e78f19fb8885` | MIT               |
| HIA main Portal/CLI              | `75f50884c69c2dbe7ffc6f4a22fe15988d5b476d` | MIT package train |

JSDoc `4.0.5` is supplied by the plugin owner's existing lock/install and is Apache-2.0. This BP adds no dependency and does not consume
the private `hia-jsdoc` umbrella.

## Run

Node `24.12.0` is primary and `22.23.0` is the compatibility runtime. Node 20 remains an upstream-reproduction slot and is not a new
documentation-tool support promise. Every Node/npm/pnpm command is launched through mise:

```bash
mise exec node@24.12.0 -- node tools/hia-docs/build.mjs
mise exec node@24.12.0 -- node tools/hia-docs/check.mjs
```

To verify compatibility, repeat both commands with `node@22.23.0`. The build invokes the main owner's own mise/pnpm lock before running
its CLI. If the pinned JPHS `node_modules/jsdoc/jsdoc.js` is absent, bootstrap that owner explicitly with its lock:

```bash
cd ../../HIA/jsdoc-plugin-hia-sys
mise exec node@24.12.0 npm@11.8.0 -- npm ci --ignore-scripts --no-audit --no-fund
```

## Outputs and privacy

Generated files are ignored under `build/hia-docs/`:

- `jsdoc-native/`: independent JTH output;
- `portal/`: unified HIA CLI/renderer output;
- `cache/hia-integration.public.json`: sanitized handoff consumed by the Portal;
- `evidence/`: counts, relative filenames, hashes, policy, and status only.

The source presentation policy is `none/link`: source links are pinned to the exact BP build commit, preview/embed is disabled, and the
generated site performs no source fetch. The build removes temporary config and raw integration files even on failure. The checker
refuses absolute paths, source-body fingerprints, raw comments/locale tags, credential markers, unpinned source links, or source-content
keys in public JSON.

## Scope and rollback

The tool refuses changes outside the frozen documentation paths and refuses any root package/lock drift. It rebuilds only the exact
ignored `build/hia-docs/` directory after resolving that boundary under the BP repository. Removing that ignored directory rolls back
local generated output; reverting the focused HIA documentation commit rolls back the authored overlay without rewriting upstream
history.

This tooling does not enable GitHub Actions or Pages, publish a package, use BrowserStack, read credentials, or access a target project.

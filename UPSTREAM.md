# 上游来源与衍生项目说明 / Upstream Provenance and Derivative Notice

## 项目定位 / Project identity

本仓库是 HIA-Documentation-Sys 的文档化工程示例库，以真实、稳定的开源代码为基线，逐步建设代码注释、源码关系、
多语言文档、质量门禁和公开呈现。原始软件、API 设计和既有文档归属于 js-cookie 项目及其贡献者。

This repository is a documentation-engineering example maintained for HIA-Documentation-Sys. It uses stable, real-world open-source
code as a baseline for source documentation, relationships, localization, quality gates, and public presentation. The original software,
API design, and existing documentation belong to the js-cookie project and its contributors.

本仓库不是 js-cookie 官方仓库，不暗示合作关系、官方 fork 或上游 endorsement。HIA 文档、文档工具、Pages 与本仓流程的问题
应提交到本衍生仓；js-cookie runtime、API 与上游发行的问题应提交到[上游项目](https://github.com/js-cookie/js-cookie)。

This repository is not the official js-cookie repository and does not imply affiliation, an official fork, or upstream endorsement.
Report HIA documentation, documentation tooling, Pages, and repository-process issues here. Report js-cookie runtime, API, and
upstream release issues to the [upstream project](https://github.com/js-cookie/js-cookie).

## 冻结的源码基线 / Frozen source baseline

| 字段 / Field                   | 值 / Value                                                             |
| ------------------------------ | ---------------------------------------------------------------------- |
| 上游仓库 / Upstream repository | `https://github.com/js-cookie/js-cookie.git`                           |
| 正式版本 / Release             | [`v3.0.8`](https://github.com/js-cookie/js-cookie/releases/tag/v3.0.8) |
| Annotated tag object           | `4e322ed321604ec1978d8fa94fb9d178f5bdbc44`                             |
| Peeled source commit           | `d7a10966e3f2cbcbfa96e34e7544d23aab9e3372`                             |
| 基线采集日 / Capture date      | `2026-08-09`                                                           |
| 上游许可证 / Upstream license  | MIT；保留仓库根目录 [`LICENSE`](LICENSE)                               |
| LICENSE SHA-256                | `f23a2e184e548200955485849b6a57b423a0f0e42d174410fb1047348cd51711`     |

HIA 文档化改动从上述 peeled commit 之后的独立提交开始。`main` 不会因重新 fetch 自动改变基线；任何上游升级都必须经过
单独 review，并记录新旧 tag/commit、license、测试和文档差异。

HIA documentation changes begin in separate commits after the peeled commit above. Fetching does not move the baseline automatically.
Every upstream upgrade requires an explicit review of tag/commit identity, license, tests, and documentation differences.

## npm 分发对应关系 / npm distribution relationship

| 字段 / Field  | 值 / Value                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------- |
| npm package   | [`js-cookie@3.0.8`](https://www.npmjs.com/package/js-cookie/v/3.0.8)                              |
| npm `gitHead` | `248e685e20c7aa9553453f0084f14a62173462d2`                                                        |
| npm integrity | `sha512-yeJd4aNAdYZQjaon2bpD/Gb0B/omw7HQOsynXXcOiWVCacbBcPlgn8S/d1X6blFSaHao7ozqtW7NZW19xpCtIw==` |

npm `gitHead` 是 release tag peeled commit 的直接父提交。两者之间的 `Craft v3.0.8 release` 提交只修改
`package.json`/`package-lock.json` 的版本字段；runtime source 不变。因此，本仓库用 GitHub release tag 表示源码基线，
同时独立保存 npm `gitHead` 与 integrity，避免把 source provenance 和 package provenance 合并为同一事实。

The npm `gitHead` is the direct parent of the release tag's peeled commit. The intervening `Craft v3.0.8 release` commit changes only
the version fields in `package.json` and `package-lock.json`, not runtime source. This repository therefore records the GitHub release
tag as source provenance and the npm `gitHead` and integrity as separate package provenance.

## Git remote 与同步策略 / Git remotes and synchronization

- `upstream`：只用于读取 `https://github.com/js-cookie/js-cookie.git` 的公开历史、branches 和 tags；
- `origin`：HIA 文档化工程仓库 `https://github.com/mandolin/bp-docs-js-cookie.git`；
- HIA-owned default branch：`main`；
- 初始 clone 保留完整历史，不使用 shallow clone、archive download 或无历史 source snapshot；
- 后续 upstream 同步必须是显式、可审查的独立变更，不能静默覆盖文档化工程提交。

- `upstream` reads public history, branches, and tags from `https://github.com/js-cookie/js-cookie.git`;
- `origin` is the HIA documentation-engineering repository at `https://github.com/mandolin/bp-docs-js-cookie.git`;
- the HIA-owned default branch is `main`;
- the initial clone preserves history and is not a shallow clone, archive download, or history-free source snapshot;
- future upstream synchronization must be explicit and reviewable and must never silently overwrite documentation-engineering commits.

## 自动化边界 / Automation boundary

本节描述可见仓库文件和已记录的历史事实，不代表当前 GitHub repository-level Actions/Pages 设置；该私有设置未在本次核对。
`.github/workflows/hia-docs-pages.yml` 是 HIA-owned Pages workflow，文件配置了 `main` push 与手动触发、public artifact 上传
和 Pages deploy。WorkZone 记录了该 workflow 在 BP `183f508` 上的成功运行（run `33992216871`）；这项历史 evidence 不证明
当前 Pages 设置或当前线上状态。上游 CI workflow 文件保留作 provenance review，不应被描述为 HIA 的自动化运行事实。

`.github/workflows/release.yml` 现在只提供手动禁用说明，不执行发布命令；root `release` script 已移除，`.release-it.json` 的
npm version/update/publish 与 GitHub release、Git commit、tag 和 push 均显式关闭。HIA 衍生仓不发布 js-cookie 的 npm package 或 GitHub release。
上游 `.github/dependabot.yml` 已从 HIA 分支移除；导入期间产生的 Dependabot 活动按下方历史记录处理。此处不推断当前仓库设置。

导入时，GitHub 在安全开关完成前自动运行了 2 个 Dependabot update job，并创建 9 个未合并 PR。HIA 随即关闭这些 PR、
删除对应自动分支；没有 repository CI/build/test workflow 运行，也没有自动更新进入 `main`。

This section describes visible repository files and recorded history; it does not assert
the current GitHub repository-level Actions or Pages settings, which were not checked.
`.github/workflows/hia-docs-pages.yml` is the HIA-owned Pages workflow. Its file defines
`main` push and manual triggers, public artifact upload, and Pages deployment. WorkZone
records a successful run on BP commit `183f508` (run `33992216871`); that historical
evidence does not establish current Pages settings or current site status. Inherited
upstream CI workflow files are retained for provenance review and are not evidence of
HIA automation runs.

`.github/workflows/release.yml` now only reports that release is disabled and runs no
release command. The root `release` script is removed, and `.release-it.json` explicitly
disables npm versioning/publishing, GitHub releases, Git commits, tags, and pushes. This HIA derivative does
not publish the js-cookie npm package or GitHub releases. The upstream
`.github/dependabot.yml` is removed from HIA `main`; the import-time Dependabot activity
is described below. No current repository setting is inferred here.

During import, GitHub started two Dependabot update jobs before the safety setting was
applied and created nine unmerged pull requests. HIA closed those pull requests and
deleted their automation branches. No repository CI/build/test workflow ran, and no
automated update entered `main`.

## 验证说明 / Verification note

采集时 GitHub API 对 `v3.0.8` annotated tag/commit 的 verification 返回 `verified=false`、reason `bad_cert`。本仓库据此不
宣称该 tag 已完成密码学签名验证；provenance 依赖官方 release URL、tag object、peeled commit 与独立 npm integrity 的
组合记录。

At capture time, GitHub's API reported `verified=false` with reason `bad_cert` for the annotated `v3.0.8` tag/commit. This repository
therefore makes no claim of cryptographic signature verification and records the official release URL, tag object, peeled commit, and
independent npm integrity together.

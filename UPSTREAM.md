# 上游来源与衍生项目说明 / Upstream Provenance and Derivative Notice

## 项目定位 / Project identity

本仓库是 HIA-Documentation-Sys 的文档化工程示例库，以真实、稳定的开源代码为基线，逐步建设代码注释、源码关系、
多语言文档、质量门禁和公开呈现。原始软件、API 设计和既有文档归属于 js-cookie 项目及其贡献者。

This repository is a documentation-engineering example maintained for HIA-Documentation-Sys. It uses stable, real-world open-source
code as a baseline for source documentation, relationships, localization, quality gates, and public presentation. The original software,
API design, and existing documentation belong to the js-cookie project and its contributors.

本仓库不是 js-cookie 官方仓库，不暗示合作关系、官方 fork 或上游 endorsement。问题与变更应根据归属分别提交到本衍生
仓库或[上游项目](https://github.com/js-cookie/js-cookie)。

This repository is not the official js-cookie repository and does not imply affiliation, an official fork, or upstream endorsement.
Issues and changes should be filed with this derivative or the [upstream project](https://github.com/js-cookie/js-cookie), as appropriate.

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

HIA `main` 不启用上游自动化。仓库保留上游 workflow 文件用于来源审阅，但 repository-level GitHub Actions 已关闭；
上游 `.github/dependabot.yml` 已从 HIA 分支移除，避免在文档化工程尚未建立门禁时自动创建依赖升级分支或 PR。
Pages、构建、测试、发布和依赖更新自动化均须在后续独立周期中显式评审后启用。

导入时，GitHub 在安全开关完成前自动运行了 2 个 Dependabot update job，并创建 9 个未合并 PR。HIA 随即关闭这些 PR、
删除对应自动分支；没有 repository CI/build/test workflow 运行，也没有自动更新进入 `main`。

Upstream workflow files are retained for provenance review, while repository-level
GitHub Actions are disabled. The upstream `.github/dependabot.yml` is removed from HIA
`main` so dependency-update branches and pull requests cannot be created before an
explicit documentation-engineering automation review. Pages, build, test, release,
and dependency-update automation remain disabled until a later dedicated cycle.

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

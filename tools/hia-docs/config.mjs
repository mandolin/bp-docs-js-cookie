/**
 * <lang><zh-CN>冻结 bp-docs-js-cookie 本地文档工程的 owner、输入、输出与隐私配置。</zh-CN><en>Freezes owners, inputs, outputs, and privacy configuration for the bp-docs-js-cookie local documentation pipeline.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-config
 * @lang zh-CN 本文件只描述相对 sibling topology，不保存宿主绝对路径或 credential。
 * @lang en This file describes only relative sibling topology and stores no host absolute path or credential.
 */

import path from 'node:path'

/** @lang zh-CN W-P107 冻结的 BP 文档化基线 commit。 @lang en BP documentation baseline commit frozen by W-P107. */
export const BASELINE_COMMIT = '630038410a1e0738dc761de653c6f6a09b2d8930'

/** @lang zh-CN 允许 JSDoc 解析且允许 ROP 注释变更的精确源码集合。 @lang en Exact source set that JSDoc may parse and the ROP overlay may modify. */
export const SOURCE_FILES = Object.freeze([
  'index.js',
  'src/api.mjs',
  'src/assign.mjs',
  'src/converter.mjs'
])

/** @lang zh-CN W-P109 可变更的辅助路径模式；root package/lock、test、dist 与 workflow 不在其中。 @lang en Auxiliary path patterns writable in W-P109; root package/lock, tests, dist, and workflows are excluded. */
export const ALLOWED_CHANGE_PATTERNS = Object.freeze([
  '.gitignore',
  'README.md',
  'UPSTREAM.md',
  ...SOURCE_FILES,
  'docs/hia/',
  'tools/hia-docs/'
])

/** @lang zh-CN sibling owner 必须保持的完整 Git identity。 @lang en Full Git identities that sibling owners must retain. */
export const OWNER_COMMITS = Object.freeze({
  plugin: '3cdd56469044bf40881cf88c4905110ad656ab13',
  theme: 'e2e85fb23ad9274b730c84c24af9e78f19fb8885',
  portal: '75f50884c69c2dbe7ffc6f4a22fe15988d5b476d'
})

/** @lang zh-CN 文档工具支持窗口；Node 20 只属于上游复现，不属于该集合。 @lang en Documentation-tool support window; Node 20 belongs only to upstream reproduction and is not in this set. */
export const DOCUMENTATION_NODE_VERSIONS = Object.freeze(['22.23.0', '24.12.0'])

/** @lang zh-CN 公开输出强制采用的源码与隐私策略。 @lang en Source and privacy policy required for public outputs. */
export const PRIVACY_POLICY = Object.freeze({
  sourceContentPolicy: 'none',
  sourceDisplayMode: 'link',
  sourceFetchAllowed: false,
  absolutePathAllowed: false,
  rawCommentAllowedInIndex: false,
  sourceBodyAllowedInIndex: false,
  credentialAllowed: false,
  realCookieValueAllowed: false,
  analyticsAllowed: false,
  telemetryAllowed: false
})

/**
 * <lang><zh-CN>从 BP root 推导已冻结的 workspace sibling topology 与 ignored 输出位置。</zh-CN><en>Derives the frozen workspace sibling topology and ignored output locations from the BP root.</en></lang>
 *
 * @param {string} repositoryRoot <lang><zh-CN>bp-docs-js-cookie 仓库绝对根目录。</zh-CN><en>Absolute bp-docs-js-cookie repository root.</en></lang>
 * @returns {Object} <lang><zh-CN>只在当前进程内使用的绝对路径集合。</zh-CN><en>Absolute paths used only in the current process.</en></lang>
 * @lang zh-CN 返回值不得序列化到公开产物；build evidence 只保存相对路径、commit、计数和 hash。
 * @lang en The return value must not be serialized to public artifacts; build evidence stores only relative paths, commits, counts, and hashes.
 */
export function resolveTopology(repositoryRoot) {
  // <lang><zh-CN>workspace root 是 BP 仓库向上两级；该固定关系来自 W-P107 的 sibling owner 决策。</zh-CN><en>The workspace root is two levels above the BP repository; this fixed relation comes from the W-P107 sibling-owner decision.</en></lang>
  const workspaceRoot = path.resolve(repositoryRoot, '..', '..')
  // <lang><zh-CN>所有生成输出共享一个可边界验证的 ignored root，便于安全重建而不触碰其他 build 目录。</zh-CN><en>All generated outputs share one boundary-checkable ignored root so it can be safely rebuilt without touching other build directories.</en></lang>
  const generatedRoot = path.join(repositoryRoot, 'build', 'hia-docs')

  return {
    repositoryRoot,
    workspaceRoot,
    pluginRoot: path.join(workspaceRoot, 'HIA', 'jsdoc-plugin-hia-sys'),
    themeRoot: path.join(workspaceRoot, 'HIA', 'jsdoc-theme-hia'),
    portalRoot: path.join(workspaceRoot, 'main-repo'),
    generatedRoot,
    jsdocNativeRoot: path.join(generatedRoot, 'jsdoc-native'),
    portalOutputRoot: path.join(generatedRoot, 'portal'),
    evidenceRoot: path.join(generatedRoot, 'evidence'),
    cacheRoot: path.join(generatedRoot, 'cache')
  }
}

/**
 * <lang><zh-CN>创建一次真实 JSDoc 执行使用的临时配置。</zh-CN><en>Creates the temporary configuration used by one real JSDoc execution.</en></lang>
 *
 * @param {ReturnType<typeof resolveTopology>} topology <lang><zh-CN>当前进程的已验证 topology。</zh-CN><en>Validated topology for the current process.</en></lang>
 * @param {string} buildCommit <lang><zh-CN>用于固定公开源码链接的 40 位 BP commit。</zh-CN><en>Forty-character BP commit used to pin public source links.</en></lang>
 * @returns {Object} <lang><zh-CN>可写为临时 JSON 的 JSDoc config。</zh-CN><en>JSDoc configuration that may be written as temporary JSON.</en></lang>
 * @lang zh-CN 配置只 allowlist 四个 source，关闭 preview/reference embed，并启用 zh-CN/en runtime locale。
 * @lang en The configuration allowlists only four sources, disables preview/reference embedding, and enables the zh-CN/en runtime locale.
 */
export function createJsdocConfig(topology, buildCommit) {
  // <lang><zh-CN>source root 固定到公开仓库与本次 build commit；不会生成 branch-floating 链接。</zh-CN><en>The source root is pinned to the public repository and current build commit; no branch-floating link is generated.</en></lang>
  const sourceRootUrl = `https://github.com/mandolin/bp-docs-js-cookie/blob/${buildCommit}`
  // <lang><zh-CN>raw integration 只在 ignored cache 中短暂存在，build 会清洗并立即删除。</zh-CN><en>The raw integration exists briefly in ignored cache; the build sanitizes and immediately deletes it.</en></lang>
  const rawIntegrationPath = path.join(
    topology.cacheRoot,
    'hia-integration.raw.json'
  )

  return {
    plugins: [path.join(topology.pluginRoot, 'src', 'index.cjs')],
    source: {
      include: SOURCE_FILES.map((relativePath) =>
        path.join(topology.repositoryRoot, relativePath)
      ),
      // <lang><zh-CN>JSDoc 默认 pattern 不包含 `.mjs`；显式纳入 `.js/.mjs`，但文件级 allowlist 仍是更外层边界。</zh-CN><en>JSDoc's default pattern excludes `.mjs`; include `.js/.mjs` explicitly while retaining the file-level allowlist as the outer boundary.</en></lang>
      includePattern: '.+\\.(?:js|mjs)$'
    },
    opts: {
      destination: topology.jsdocNativeRoot,
      template: topology.themeRoot,
      encoding: 'utf8',
      private: true,
      recurse: false,
      hia: {
        mode: 'hiaIntegration',
        source: {
          basePath: topology.repositoryRoot,
          mode: 'link',
          link: {
            enabled: true,
            rootUrl: sourceRootUrl,
            openMode: 'new-tab'
          },
          preview: {
            enabled: false,
            defaultExpanded: false,
            rangeStrategy: 'parser-js'
          },
          references: {
            enabled: false,
            defaultExpanded: false
          }
        },
        i18n: {
          enabled: true,
          defaultLocale: 'zh-CN',
          fallbackLocale: 'en',
          locales: ['zh-CN', 'en'],
          mode: 'runtimeSwitch',
          resources: []
        },
        integration: {
          enabled: true,
          outputFile: rawIntegrationPath
        },
        theme: {
          skin: 'lumen',
          collapse: {
            docletsDefaultExpanded: true,
            sectionsDefaultExpanded: true,
            metadataDefaultExpanded: false
          },
          languageControls: {
            mode: 'auto',
            dropdownThreshold: 4
          },
          code: {
            controls: true,
            fontFamily: 'system',
            fontSize: 13,
            lineHeight: 1.6,
            tabSize: 2,
            wrap: true
          }
        }
      }
    }
  }
}

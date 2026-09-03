/**
 * <lang><zh-CN>冻结 bp-docs-js-cookie 本地文档工程的 owner、输入、输出与隐私配置。</zh-CN><en>Freezes owners, inputs, outputs, and privacy configuration for the bp-docs-js-cookie local documentation pipeline.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-config
 * @lang zh-CN 本文件只描述相对 sibling topology，不保存宿主绝对路径或 credential。
 * @lang en This file describes only relative sibling topology and stores no host absolute path or credential.
 */

import path from 'node:path'
import process from 'node:process'

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
  '.github/workflows/hia-docs-pages.yml',
  'mise.toml',
  'README.md',
  'UPSTREAM.md',
  ...SOURCE_FILES,
  'docs/hia/',
  'tools/hia-docs/'
])

/** @lang zh-CN W-P118 展示矩阵的输出链闭集。 @lang en Closed output-pipeline set for the W-P118 showcase matrix. */
export const OUTPUT_PIPELINES = Object.freeze([
  'jphs-jth-native',
  'hia-jsdoc',
  'unified-portal'
])

/** @lang zh-CN 面向阅读的三种源码模式；none 是独立 privacy 回归，不进入 27-profile。 @lang en Three reader-facing source modes; none is a separate privacy regression and is excluded from the 27 profiles. */
export const SOURCE_READING_MODES = Object.freeze(['fetch', 'embed', 'link'])

/** @lang zh-CN JTH owner 提供的三套中性 skin identity。 @lang en Three neutral skin identities provided by the JTH owner. */
export const SHOWCASE_SKINS = Object.freeze(['classic', 'graphite', 'lumen'])

/** @lang zh-CN 公开 hub 的默认 profile。 @lang en Default profile selected by the public hub. */
export const DEFAULT_SHOWCASE_PROFILE_ID = 'unified-portal.fetch.classic'

/** @lang zh-CN sibling owner 必须保持的完整 Git identity。 @lang en Full Git identities that sibling owners must retain. */
export const OWNER_COMMITS = Object.freeze({
  plugin: 'ac1fa5831dd33c204dd2168eed812b654eab24e4',
  theme: '9c78b017567c5c23a212ae572e72ad36376ed78d',
  hiaJsdoc: '8f246729a9bec72baafab0b7699a14536ae23d29',
  portal: '52c0b70607dfb06638e3f5ccfd49e91f2d1f578f'
})

/** @lang zh-CN GitHub project Pages 的精确公开地址与 base path。 @lang en Exact public URL and base path for the GitHub project Pages site. */
export const PAGES_SITE = Object.freeze({
  canonicalUrl: 'https://mandolin.github.io/bp-docs-js-cookie/',
  projectBasePath: '/bp-docs-js-cookie/'
})

/** @lang zh-CN 文档工具支持窗口；Node 20 只属于上游复现，不属于该集合。 @lang en Documentation-tool support window; Node 20 belongs only to upstream reproduction and is not in this set. */
export const DOCUMENTATION_NODE_VERSIONS = Object.freeze(['22.23.0', '24.12.0'])

/** @lang zh-CN 公开输出强制采用的源码与隐私策略。 @lang en Source and privacy policy required for public outputs. */
export const PRIVACY_POLICY = Object.freeze({
  sourceContentPolicy: 'profile-explicit',
  sourceDisplayModes: SOURCE_READING_MODES,
  defaultSourceDisplayMode: 'fetch',
  sourceFetchAllowed: true,
  sourceBodyAllowedInTopicCarrier: true,
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
 * @param {string | undefined} ownerRootOverride <lang><zh-CN>runner 可显式提供的 owner 容器绝对路径；本地缺省使用既有 sibling workspace。</zh-CN><en>Optional absolute owner-container path for a runner; local builds retain the sibling-workspace default.</en></lang>
 * @returns {Object} <lang><zh-CN>只在当前进程内使用的绝对路径集合。</zh-CN><en>Absolute paths used only in the current process.</en></lang>
 * @lang zh-CN 返回值不得序列化到公开产物；build evidence 只保存相对路径、commit、计数和 hash。
 * @lang en The return value must not be serialized to public artifacts; build evidence stores only relative paths, commits, counts, and hashes.
 */
export function resolveTopology(
  repositoryRoot,
  ownerRootOverride = process.env.HIA_DOCS_OWNER_ROOT
) {
  // <lang><zh-CN>CI 只能使用显式绝对 owner root；本地仍复用 W-P107 冻结的两级 sibling topology。</zh-CN><en>CI may use only an explicit absolute owner root; local builds retain the two-level sibling topology frozen by W-P107.</en></lang>
  const normalizedOwnerRoot = ownerRootOverride?.trim()
  if (normalizedOwnerRoot && !path.isAbsolute(normalizedOwnerRoot)) {
    throw new Error('HIA_DOCS_OWNER_ROOT must be an absolute path when set.')
  }
  /** @type {string} */
  const workspaceRoot = normalizedOwnerRoot
    ? path.resolve(normalizedOwnerRoot)
    : path.resolve(repositoryRoot, '..', '..')
  // <lang><zh-CN>所有生成输出共享一个可边界验证的 ignored root，便于安全重建而不触碰其他 build 目录。</zh-CN><en>All generated outputs share one boundary-checkable ignored root so it can be safely rebuilt without touching other build directories.</en></lang>
  const generatedRoot = path.join(repositoryRoot, 'build', 'hia-docs')

  return {
    repositoryRoot,
    workspaceRoot,
    pluginRoot: path.join(workspaceRoot, 'HIA', 'jsdoc-plugin-hia-sys'),
    themeRoot: path.join(workspaceRoot, 'HIA', 'jsdoc-theme-hia'),
    hiaJsdocRoot: path.join(workspaceRoot, 'HIA', 'hia-jsdoc'),
    portalRoot: path.join(workspaceRoot, 'main-repo'),
    generatedRoot,
    showcaseRoot: path.join(generatedRoot, 'showcase'),
    profileOutputRoot: path.join(generatedRoot, 'showcase', 'profiles'),
    // <lang><zh-CN>public 与 showcase 分离：前者是唯一可上传的默认 Portal 产品，后者只供本地/CI 矩阵验收。</zh-CN><en>Public is separated from showcase: the former is the sole uploadable default Portal product, while the latter is only for local/CI matrix acceptance.</en></lang>
    publicArtifactRoot: path.join(generatedRoot, 'public'),
    jsdocNativeRoot: path.join(generatedRoot, 'jsdoc-native'),
    portalOutputRoot: path.join(generatedRoot, 'portal'),
    evidenceRoot: path.join(generatedRoot, 'evidence'),
    cacheRoot: path.join(generatedRoot, 'cache'),
    documentationRuntimeRoot: path.join(
      repositoryRoot,
      'tools',
      'hia-docs',
      'runtime'
    )
  }
}

/**
 * <lang><zh-CN>创建公开 Portal 使用的最小 project manifest。</zh-CN><en>Creates the minimal project manifest used by the public Portal.</en></lang>
 *
 * @returns {Object} <lang><zh-CN>只引用同一临时目录内 public integration 的安全 manifest。</zh-CN><en>A safe manifest that references only the public integration in the same temporary directory.</en></lang>
 * @lang zh-CN 标题和 semantic path 明示这是 bp-docs-js-cookie 文档工程，不把它伪装成上游官方站点。
 * @lang en The title and semantic path identify this as bp-docs-js-cookie documentation engineering rather than an upstream official site.
 */
export function createPortalProjectManifest() {
  return {
    schemaVersion: '0.1.0-draft',
    project: {
      id: 'project:bp-docs-js-cookie',
      name: 'bp-docs-js-cookie',
      title: 'bp-docs-js-cookie 文档工程 / Documentation Engineering',
      defaultLocale: 'zh-CN',
      locales: ['zh-CN', 'en'],
      productVersion: '3.0.8'
    },
    inputs: [
      {
        kind: 'jsdoc-integration',
        path: 'hia-integration.public.json',
        domain: 'js',
        semanticPath: [
          {
            kind: 'repository',
            id: 'bp-docs-js-cookie',
            label: 'bp-docs-js-cookie'
          },
          {
            kind: 'package',
            id: 'js-cookie',
            label: 'js-cookie 3.0.8'
          }
        ]
      }
    ]
  }
}

/**
 * <lang><zh-CN>创建首个 BP 展示矩阵使用的 split-site Portal 配置。</zh-CN><en>Creates the split-site Portal configuration used by the first BP showcase matrix.</en></lang>
 *
 * @param {Object} [options] <lang><zh-CN>profile 选择的源码模式、皮肤、scheme 与本地公开源码根。</zh-CN><en>Source mode, skin, scheme, and local public-source root selected by the profile.</en></lang>
 * @returns {Object} <lang><zh-CN>无路径、无 credential 的 HIA CLI 配置。</zh-CN><en>Path-free, credential-free HIA CLI configuration.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知源码模式、skin 或 scheme 会 fail closed。</zh-CN><en>An unknown source mode, skin, or scheme fails closed.</en></lang>
 * @lang zh-CN 配置始终显式采用多页信息架构；fetch 是默认源码阅读方式，embed/link 只能由 profile 明示。
 * @lang en The configuration always selects the multi-page information architecture; fetch is the default source-reading mode, while embed/link require an explicit profile.
 */
export function createPortalConfig(options = {}) {
  // <lang><zh-CN>variant 必须显式落入闭集；未知值不能静默使用 owner 默认。</zh-CN><en>A variant must belong to the closed sets explicitly; unknown values must not silently inherit owner defaults.</en></lang>
  const sourceMode = options.sourceMode ?? 'fetch'
  const skin = options.skin ?? 'portal.classic'
  const scheme = options.scheme ?? 'system'
  if (!SOURCE_READING_MODES.includes(sourceMode) && sourceMode !== 'none') {
    throw new TypeError(`Unsupported showcase source mode: ${sourceMode}`)
  }
  if (!Object.values(PORTAL_SKIN_BY_SHOWCASE_SKIN).includes(skin)) {
    throw new TypeError(`Unsupported Portal showcase skin: ${skin}`)
  }
  if (!['system', 'light', 'dark'].includes(scheme)) {
    throw new TypeError(`Unsupported Portal showcase scheme: ${scheme}`)
  }

  return {
    schemaVersion: '0.1.0',
    docs: {
      renderer: {
        projectLayout: 'split-site',
        uiLocale: 'zh-CN',
        informationArchitecture: {
          contract: 'documentation-portal-information-architecture',
          contractVersion: '0.1.0-draft',
          contentGrouping: 'semantic-container',
          loadingStrategy: 'lazy',
          memberPlacement: 'with-parent'
        }
      },
      theme: {
        name: 'default',
        skin,
        scheme
      },
      source: {
        enabled: sourceMode !== 'none',
        mode: sourceMode === 'none' ? 'none' : 'file',
        presentation: sourceMode,
        publicAssetPolicy: sourceMode === 'none' ? 'none' : 'explicit-public',
        localRoot: options.localRoot ?? '.',
        fetchTrigger: 'on-expand',
        defaultExpanded: false,
        maxLines: 400,
        openMode: 'same-tab'
      }
    }
  }
}

/** @lang zh-CN JTH skin 到 Portal owner skin 的唯一中性 identity 映射。 @lang en Sole neutral identity mapping from JTH skins to Portal-owner skins. */
const PORTAL_SKIN_BY_SHOWCASE_SKIN = Object.freeze({
  classic: 'portal.classic',
  graphite: 'portal.graphite',
  lumen: 'portal.lumen'
})

/**
 * <lang><zh-CN>把 JTH skin identity 映射为 capability 对等的 Portal skin identity。</zh-CN><en>Maps a JTH skin identity to its capability-equivalent Portal skin identity.</en></lang>
 *
 * @param {string} skin <lang><zh-CN>JTH owner 的 skin identity。</zh-CN><en>JTH-owner skin identity.</en></lang>
 * @returns {string} <lang><zh-CN>Portal owner 的中性 skin identity。</zh-CN><en>Neutral Portal-owner skin identity.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知 skin 会 fail closed。</zh-CN><en>An unknown skin fails closed.</en></lang>
 */
export function mapPortalSkin(skin) {
  const portalSkin = PORTAL_SKIN_BY_SHOWCASE_SKIN[skin]
  if (!portalSkin) throw new TypeError(`Unsupported showcase skin: ${skin}`)
  return portalSkin
}

/**
 * <lang><zh-CN>确定性创建 27 个展示 profile；surface 展开不改变 profile 数量。</zh-CN><en>Deterministically creates 27 showcase profiles; expanding surfaces does not change the profile count.</en></lang>
 *
 * @returns {Array<Object>} <lang><zh-CN>pipeline/source/skin 顺序稳定的 public-safe profile。</zh-CN><en>Public-safe profiles in stable pipeline/source/skin order.</en></lang>
 */
export function createShowcaseProfiles() {
  const profiles = []
  for (const pipeline of OUTPUT_PIPELINES) {
    for (const sourceMode of SOURCE_READING_MODES) {
      for (const skin of SHOWCASE_SKINS) {
        // <lang><zh-CN>profile route 只由三个 closed identity 组成，避免标题或 owner 私有 route 进入 URL。</zh-CN><en>The profile route is composed only from three closed identities, keeping labels and owner-private routes out of URLs.</en></lang>
        const id = `${pipeline}.${sourceMode}.${skin}`
        const route = `profiles/${pipeline}/${sourceMode}/${skin}/`
        // <lang><zh-CN>hia-jsdoc profile 同时证明 standalone 与 Portal bridge；其他 pipeline 只有自己的 owner surface。</zh-CN><en>An hia-jsdoc profile proves both standalone and Portal bridge surfaces; other pipelines expose only their owner surface.</en></lang>
        const surfaces =
          pipeline === 'hia-jsdoc'
            ? [
                { kind: 'standalone', path: `${route}standalone/` },
                { kind: 'portal-bridge', path: `${route}portal-bridge/` }
              ]
            : [
                {
                  kind: pipeline === 'unified-portal' ? 'portal' : 'standalone',
                  path: route
                }
              ]

        profiles.push({
          id,
          pipeline,
          pageMode: 'multi-page',
          sourceMode,
          skin,
          portalSkin: mapPortalSkin(skin),
          scheme: 'system',
          route,
          surfaces,
          isDefault: id === DEFAULT_SHOWCASE_PROFILE_ID
        })
      }
    }
  }
  return profiles
}

/**
 * <lang><zh-CN>创建一次真实 JSDoc 执行使用的临时配置。</zh-CN><en>Creates the temporary configuration used by one real JSDoc execution.</en></lang>
 *
 * @param {ReturnType<typeof resolveTopology>} topology <lang><zh-CN>当前进程的已验证 topology。</zh-CN><en>Validated topology for the current process.</en></lang>
 * @param {string} buildCommit <lang><zh-CN>用于固定公开源码链接的 40 位 BP commit。</zh-CN><en>Forty-character BP commit used to pin public source links.</en></lang>
 * @param {Object} [options] <lang><zh-CN>当前 profile 的 destination、integration、源码模式、skin 与 scheme。</zh-CN><en>Destination, integration, source mode, skin, and scheme for the current profile.</en></lang>
 * @returns {Object} <lang><zh-CN>可写为临时 JSON 的 JSDoc config。</zh-CN><en>JSDoc configuration that may be written as temporary JSON.</en></lang>
 * @throws {TypeError} <lang><zh-CN>未知源码模式或 skin 会 fail closed。</zh-CN><en>An unknown source mode or skin fails closed.</en></lang>
 * @lang zh-CN 配置只 allowlist 四个 source，按 profile 开启源码能力、关闭 reference embed，并启用 zh-CN/en runtime locale。
 * @lang en The configuration allowlists only four sources, enables source capabilities per profile, disables reference embedding, and enables the zh-CN/en runtime locale.
 */
export function createJsdocConfig(topology, buildCommit, options = {}) {
  // <lang><zh-CN>source root 固定到公开仓库与本次 build commit；不会生成 branch-floating 链接。</zh-CN><en>The source root is pinned to the public repository and current build commit; no branch-floating link is generated.</en></lang>
  const sourceRootUrl = `https://github.com/mandolin/bp-docs-js-cookie/blob/${buildCommit}`
  // <lang><zh-CN>raw integration 只在 ignored cache 中短暂存在，build 会清洗并立即删除。</zh-CN><en>The raw integration exists briefly in ignored cache; the build sanitizes and immediately deletes it.</en></lang>
  const rawIntegrationPath =
    options.integrationOutputFile ??
    path.join(topology.cacheRoot, 'hia-integration.raw.json')
  // <lang><zh-CN>destination、source mode 与 skin 由矩阵 profile 决定；默认值保持 W-P118 规范默认。</zh-CN><en>Destination, source mode, and skin are selected by the matrix profile; defaults retain the W-P118 normative choices.</en></lang>
  const destination = options.destination ?? topology.jsdocNativeRoot
  const sourceMode = options.sourceMode ?? 'fetch'
  const skin = options.skin ?? 'classic'
  const scheme = options.scheme ?? 'system'
  if (!SOURCE_READING_MODES.includes(sourceMode) && sourceMode !== 'none') {
    throw new TypeError(`Unsupported showcase source mode: ${sourceMode}`)
  }
  if (!SHOWCASE_SKINS.includes(skin)) {
    throw new TypeError(`Unsupported showcase skin: ${skin}`)
  }

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
      destination,
      template: topology.themeRoot,
      encoding: 'utf8',
      private: true,
      recurse: false,
      hia: {
        mode: options.hiaMode ?? 'standalone',
        source: {
          basePath: topology.repositoryRoot,
          mode: sourceMode === 'none' ? 'metadata' : 'all',
          link: {
            enabled: true,
            rootUrl: sourceRootUrl,
            openMode: 'new-tab'
          },
          preview: {
            enabled: sourceMode !== 'none',
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
        presentation: {
          pageMode: 'multi-page',
          sourceMode
        },
        integration: {
          enabled: true,
          outputFile: rawIntegrationPath
        },
        theme: {
          skin,
          scheme,
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

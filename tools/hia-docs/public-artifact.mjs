/**
 * <lang><zh-CN>把本地/CI 展示矩阵中的默认 Portal surface 物化为独立的单 profile 公共产物。</zh-CN><en>Materializes the default Portal surface from the local/CI showcase matrix as an isolated single-profile public artifact.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-public-artifact
 * @lang zh-CN 本模块不生成文档语义，不读取 credential，也不把其它测试 profile 或 chooser 复制到公开根。
 * @lang en This module generates no documentation semantics, reads no credentials, and copies neither other test profiles nor the chooser into the public root.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** @lang zh-CN 当前工具目录只用于读取版本化产品资产，不会写入公开 manifest。 @lang en Current tool directory is used only to read versioned product assets and is never written to the public manifest. */
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))

/** @lang zh-CN 公开发布描述的中性契约标识。 @lang en Neutral contract identifier for the public publication description. */
export const PUBLICATION_PROFILE_CONTRACT =
  'bp-documentation-publication-profile@0.1.0-draft'
/** @lang zh-CN 维护者确认的一级设计基线。 @lang en Maintainer-confirmed level-one design baseline. */
export const PUBLICATION_BASELINE_ID =
  'BP-JS-COOKIE-DEFAULT-PORTAL-BASELINE-20260904-B'
/** @lang zh-CN 冻结的默认公开 profile 身份。 @lang en Frozen default public-profile identity. */
export const PUBLIC_PROFILE_ID = 'unified-portal.fetch.classic'
/** @lang zh-CN baseline B 冻结的七个公开/导出 API 标签。 @lang en Seven public/exported API labels frozen by baseline B. */
export const PUBLIC_API_LABELS = Object.freeze([
  'set',
  'get',
  'remove',
  'withAttributes',
  'withConverter',
  'CookieAttributes',
  'CookieConverter'
])
/**
 * <lang><zh-CN>首页与搜索只精选公开 project-index 中这两个 API symbol；entry identity 和页面路径始终由本次生成 manifest 提供。</zh-CN><en>The landing and search feature only these two public API symbols from the project index; entry identities and page paths always come from the current generated manifest.</en></lang>
 *
 * @type {Readonly<Record<string, string>>}
 */
const FEATURED_API_SYMBOLS = Object.freeze({
  set: 'jsdoc:function:module:js-cookie/api~init~set',
  get: 'jsdoc:function:module:js-cookie/api~init~get'
})
/**
 * <lang><zh-CN>为 baseline B 的 set/get 主体配置类型与示例；说明文字从公开 project-index 的双语 JSDoc 字段读取。</zh-CN><en>Configures the types and examples for Baseline B's set/get contracts; descriptive text is read from bilingual JSDoc fields in the public project index.</en></lang>
 *
 * @type {Readonly<Record<string, Object>>}
 */
const PUBLIC_API_CONTRACTS = Object.freeze({
  [FEATURED_API_SYMBOLS.set]: Object.freeze({
    pageId: 'set',
    signature: 'Cookies.set(name, value, attributes?) → string | undefined',
    parameters: Object.freeze([
      Object.freeze({
        name: 'name',
        type: 'string',
        optional: false,
        descriptionPath: 'params.name.description',
        note: Object.freeze({
          'zh-CN': '名称或值含有无法 URI 编码的输入时会抛出 URIError。',
          en: 'A name or value containing input that cannot be URI-encoded throws URIError.'
        })
      }),
      Object.freeze({
        name: 'value',
        type: 'unknown',
        optional: false,
        descriptionPath: 'params.value.description'
      }),
      Object.freeze({
        name: 'attributes',
        type: 'CookieAttributes',
        optional: true,
        descriptionPath: 'params.attributes.description'
      })
    ]),
    returnType: 'string | undefined',
    returnDescriptionPath: 'returns.0.description',
    example: `Cookies.set('theme', 'dark', {
  expires: 7,
  sameSite: 'lax',
  secure: true
})`,
    behavior: Object.freeze({
      'zh-CN': '调用会写入 document.cookie。浏览器可依据 domain、path、安全上下文与 Cookie policy 拒绝或调整结果；客户端 JavaScript 无法读取 HttpOnly Cookie，也不能创建带 HttpOnly 属性的 Cookie。',
      en: 'The call writes document.cookie. The browser may reject or adjust the result according to domain, path, secure context, and Cookie policy; client-side JavaScript cannot read an HttpOnly Cookie or create one with the HttpOnly attribute.'
    })
  }),
  [FEATURED_API_SYMBOLS.get]: Object.freeze({
    pageId: 'get',
    signature: 'Cookies.get(name?) → string | Object | undefined',
    parameters: Object.freeze([
      Object.freeze({
        name: 'name',
        type: 'string',
        optional: true,
        descriptionPath: 'params.name.description'
      })
    ]),
    returnType: 'string | Object | undefined',
    returnDescriptionPath: 'returns.0.description',
    example: `Cookies.get('theme') // → 'dark'
Cookies.get() // → { theme: 'dark', locale: 'zh-CN' }`,
    behavior: Object.freeze({
      'zh-CN': '只读取当前文档通过 document.cookie 可见的 Cookie；HttpOnly、其它 domain/path 或被浏览器策略隐藏的 Cookie 不会出现。单个畸形 Cookie 的解码错误不会阻断其它可见 Cookie；自定义 converter 也可能改变无参数映射中各值的类型。',
      en: 'Reads only Cookies visible through document.cookie to the current document; HttpOnly, other-domain/path, and browser-hidden Cookies do not appear. A malformed Cookie decoding error does not block other visible Cookies; a custom converter may also change the value types in the no-argument map.'
    })
  })
})
/** @lang zh-CN 产品高亮器来自私有 tooling runtime 的固定安装位置。 @lang en The product highlighter comes from the pinned private tooling-runtime installation. */
const prismRoot = path.join(
  moduleDirectory,
  'runtime',
  'node_modules',
  'prismjs'
)

/**
 * <lang><zh-CN>建立不含路径或源码正文的公开发布 manifest。</zh-CN><en>Creates a public publication manifest containing neither host paths nor source bodies.</en></lang>
 *
 * @param {{buildCommit:string}} options <lang><zh-CN>已验证 BP commit。</zh-CN><en>Validated BP commit.</en></lang>
 * @returns {Object} <lang><zh-CN>可进入 Pages 根的稳定发布 facts。</zh-CN><en>Stable publication facts safe for the Pages root.</en></lang>
 * @throws {TypeError} <lang><zh-CN>commit 不是完整 SHA 时抛出。</zh-CN><en>Thrown when the commit is not a full SHA.</en></lang>
 */
export function createPublicArtifactManifest({ buildCommit }) {
  if (!/^[0-9a-f]{40}$/u.test(buildCommit)) {
    throw new TypeError('Public artifact buildCommit must be a full Git SHA.')
  }

  return {
    contract: PUBLICATION_PROFILE_CONTRACT,
    contractVersion: '0.1.0-draft',
    designBaseline: {
      id: PUBLICATION_BASELINE_ID,
      version: '0.2.0',
      status: 'maintainer-confirmed'
    },
    buildCommit,
    publicProfileCount: 1,
    localCiCoverageProfileCount: 27,
    rootIsProfileChooser: false,
    reviewOnlyElementsIncluded: false,
    defaultProfile: {
      id: PUBLIC_PROFILE_ID,
      pipeline: 'unified-portal',
      sourceMode: 'fetch',
      skin: 'classic',
      portalSkin: 'portal.classic',
      pageMode: 'multi-page',
      sourcePresentation: 'same-origin-fetch-on-expand',
      uiLocale: {
        default: 'zh-CN',
        supported: ['zh-CN', 'en'],
        profileId: 'portal.default',
        surfaceId: 'portal.split-site',
        reportPath: 'documentation-ui-locale-completeness.json',
        noScriptLocaleIndexes: [
          'pages/zh-CN/index.html',
          'pages/en/index.html'
        ]
      }
    },
    informationArchitecture: [
      'global-header',
      'primary-sidebar',
      'breadcrumb',
      'main-topic',
      'local-outline',
      'footer-relations'
    ],
    apiScope: {
      options: ['public', 'all'],
      default: 'public',
      publicEntryCount: PUBLIC_API_LABELS.length,
      allEntryCount: 18,
      definition: 'public-exported-api'
    },
    displaySettings: {
      siteThemes: ['system', 'light', 'dark'],
      siteThemeDefault: 'light',
      codeThemes: [
        'site',
        'paper-light',
        'midnight',
        'solarized-light',
        'solarized-dark',
        'high-contrast'
      ],
      codeThemeDefault: 'site',
      codeFontSizes: ['small', 'default', 'large'],
      codeWrap: ['scroll', 'wrap'],
      codeLineNumbers: ['hide', 'show'],
      codeLineNumbersDefault: 'show',
      contentWidths: ['comfortable', 'wide'],
      contentVisibility: [
        'metadata',
        'contract',
        'coverage',
        'provenance',
        'relations'
      ],
      contentVisibilityDefaults: {
        metadata: 'hide',
        contract: 'show',
        coverage: 'hide',
        provenance: 'show',
        relations: 'hide'
      },
      codeRuntime: 'prismjs-1.30.0-after-verified-source',
      highlighter: {
        package: 'prismjs',
        version: '1.30.0',
        license: 'MIT',
        localOnly: true,
        verifiedSourceRequired: true,
        plainTextFallback: true,
        sourceExecution: false
      }
    },
    privacy: {
      credentialRequired: false,
      analytics: false,
      sourceBodyExecution: false,
      preferenceStorage: 'device-local-display-only'
    }
  }
}

/**
 * <lang><zh-CN>把 owner 的平铺 package 导航分组，并把仅对生成器有意义的 view/repository 层压平为读者入口。</zh-CN><en>Groups the owner's flat package navigation and flattens generator-oriented view/repository layers into the reader entry point.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>已复制的公开 Portal 根。</zh-CN><en>Copied public Portal root.</en></lang>
 * @returns {{publicEntryCount:number,allEntryCount:number}} <lang><zh-CN>分组后的计数。</zh-CN><en>Counts after grouping.</en></lang>
 * @throws {Error} <lang><zh-CN>导航 shard 或冻结公开集合漂移时 fail closed。</zh-CN><en>Fails closed when the navigation shard or frozen public set drifts.</en></lang>
 */
export function groupApiScopeNavigation(publicRoot) {
  // <lang><zh-CN>navigationRoot 仅解析 public artifact 内的固定导航目录。</zh-CN><en>navigationRoot resolves only the fixed navigation directory inside the public artifact.</en></lang>
  const navigationRoot = path.join(publicRoot, 'navigation')
  if (!fs.existsSync(navigationRoot)) {
    return { publicEntryCount: 0, allEntryCount: 0 }
  }
  // <lang><zh-CN>packageShardNames 必须唯一定位 js-cookie package shard，避免误改其它层级。</zh-CN><en>packageShardNames must identify the js-cookie package shard uniquely so no other hierarchy is rewritten.</en></lang>
  const packageShardNames = fs
    .readdirSync(navigationRoot)
    .filter((fileName) =>
      /^semantic-repository-bp-docs-js-cookie-package-js-cookie-[a-f0-9]+\.json$/u.test(
        fileName
      )
    )
  if (packageShardNames.length !== 1) {
    throw new Error('Default Portal package navigation shard is not unique.')
  }
  // <lang><zh-CN>packageShard 只包含已公开的 metadata，不读取源码正文。</zh-CN><en>packageShard contains public metadata only and reads no source body.</en></lang>
  const packageShardPath = path.join(navigationRoot, packageShardNames[0])
  const packageShard = JSON.parse(fs.readFileSync(packageShardPath, 'utf8'))
  if (
    !Array.isArray(packageShard.children) ||
    packageShard.children.length !== 18
  ) {
    throw new Error('Default Portal package navigation entry count drifted.')
  }

  // <lang><zh-CN>publicLabelsSet 是 baseline B 的 closed public/exported API 集合。</zh-CN><en>publicLabelsSet is baseline B's closed public/exported API set.</en></lang>
  const publicLabelsSet = new Set(PUBLIC_API_LABELS)
  // <lang><zh-CN>publicEntries 保留 owner node identity 与真实 content route。</zh-CN><en>publicEntries preserve owner node identities and real content routes.</en></lang>
  const publicEntries = packageShard.children.filter((entry) =>
    publicLabelsSet.has(entry.label)
  )
  // <lang><zh-CN>internalEntries 是同一平铺集合的确定性补集。</zh-CN><en>internalEntries are the deterministic complement of the same flat set.</en></lang>
  const internalEntries = packageShard.children.filter(
    (entry) => !publicLabelsSet.has(entry.label)
  )
  if (
    publicEntries.length !== PUBLIC_API_LABELS.length ||
    internalEntries.length !== 11 ||
    new Set(publicEntries.map((entry) => entry.label)).size !==
      PUBLIC_API_LABELS.length
  ) {
    throw new Error('Default Portal public API classification drifted.')
  }

  packageShard.children = [
    {
      id: 'bp:public-api',
      kind: 'api-scope',
      label: '公开接口 API',
      entryCount: publicEntries.length,
      views: ['js'],
      children: publicEntries
    },
    {
      id: 'bp:internal-api',
      kind: 'api-scope',
      label: '内部实现',
      entryCount: internalEntries.length,
      views: ['js'],
      children: internalEntries
    }
  ]
  fs.writeFileSync(
    packageShardPath,
    `${JSON.stringify(packageShard, null, 2)}\n`,
    'utf8'
  )

  // <lang><zh-CN>最小单元 fixture 可以只提供 package shard；真实公开产物必须继续校验并压平完整 root → view → repository → package 链。</zh-CN><en>A minimal unit fixture may provide only the package shard; a real public artifact must additionally validate and flatten its complete root → view → repository → package chain.</en></lang>
  const rootShardPath = path.join(navigationRoot, 'root.json')
  if (fs.existsSync(rootShardPath)) {
    /**
     * <lang><zh-CN>读取公开根内的 owner 导航引用，并拒绝跨目录或非 JSON 路径。</zh-CN><en>Reads an owner navigation reference inside the public root and rejects traversal or non-JSON paths.</en></lang>
     *
     * @param {unknown} reference <lang><zh-CN>owner shard 中的相对引用。</zh-CN><en>Relative reference from an owner shard.</en></lang>
     * @returns {Object} <lang><zh-CN>已解析导航 shard。</zh-CN><en>Parsed navigation shard.</en></lang>
     */
    const readNavigationReference = (reference) => {
      if (
        typeof reference !== 'string' ||
        !/^navigation\/[A-Za-z0-9-]+\.json$/u.test(reference)
      ) {
        throw new Error('Default Portal navigation reference is not safe.')
      }
      // <lang><zh-CN>candidatePath 在读取前再次按绝对路径边界校验，避免仅依赖正则。</zh-CN><en>candidatePath is checked again against the absolute directory boundary before reading, rather than relying on the regular expression alone.</en></lang>
      const candidatePath = path.resolve(publicRoot, ...reference.split('/'))
      const navigationBoundary = `${path.resolve(navigationRoot)}${path.sep}`
      if (!candidatePath.startsWith(navigationBoundary)) {
        throw new Error('Default Portal navigation reference escaped its root.')
      }
      return JSON.parse(fs.readFileSync(candidatePath, 'utf8'))
    }

    // <lang><zh-CN>rootShard 是浏览器首个读取的导航事实，因此压平发生在生成期而不是用 CSS 隐藏层级。</zh-CN><en>rootShard is the first navigation fact read by the browser, so flattening happens at generation time rather than hiding levels with CSS.</en></lang>
    const rootShard = JSON.parse(fs.readFileSync(rootShardPath, 'utf8'))
    const viewNode = rootShard.children?.[0]
    if (
      rootShard.children?.length !== 1 ||
      viewNode?.kind !== 'view' ||
      !viewNode.childrenPath
    ) {
      throw new Error('Default Portal root navigation hierarchy drifted.')
    }
    const viewShard = readNavigationReference(viewNode.childrenPath)
    const repositoryNode = viewShard.children?.[0]
    if (
      viewShard.children?.length !== 1 ||
      repositoryNode?.kind !== 'repository' ||
      !repositoryNode.childrenPath
    ) {
      throw new Error('Default Portal repository navigation hierarchy drifted.')
    }
    const repositoryShard = readNavigationReference(repositoryNode.childrenPath)
    const packageNode = repositoryShard.children?.[0]
    if (
      repositoryShard.children?.length !== 1 ||
      packageNode?.kind !== 'package' ||
      packageNode.childrenPath !== `navigation/${packageShardNames[0]}`
    ) {
      throw new Error('Default Portal package navigation hierarchy drifted.')
    }
    rootShard.children = [packageNode]
    fs.writeFileSync(
      rootShardPath,
      `${JSON.stringify(rootShard, null, 2)}\n`,
      'utf8'
    )
  }
  return {
    publicEntryCount: publicEntries.length,
    allEntryCount: publicEntries.length + internalEntries.length
  }
}

/**
 * <lang><zh-CN>生成确认稿对应的全局 header。</zh-CN><en>Generates the global header from the confirmed design.</en></lang>
 *
 * @returns {string} <lang><zh-CN>无外部资源的 HTML fragment。</zh-CN><en>HTML fragment with no external resources.</en></lang>
 */
function renderPublicHeader() {
  return `<a class="hia-public-skip" href="#hia-public-main" data-hia-public-i18n="skip">跳到正文</a><header class="hia-public-header" data-hia-public-product><a class="hia-public-brand" href="./" aria-label="js-cookie 文档首页" data-hia-public-i18n-aria="home"><span class="hia-public-brand-mark" aria-hidden="true">JS</span><span class="hia-public-brand-copy"><strong>js-cookie</strong><small>HIA Documentation Portal</small></span></a><button class="hia-public-search-trigger" type="button" data-hia-public-search aria-haspopup="dialog" aria-controls="hia-public-search"><span data-hia-public-i18n="search">搜索文档</span> <kbd>Ctrl K</kbd></button><div class="hia-public-header-actions"><span class="hia-public-version">v3.0.8</span><button class="hia-public-quiet-button hia-public-mobile-search" type="button" data-hia-public-search aria-haspopup="dialog" aria-controls="hia-public-search" aria-label="打开文档搜索" data-hia-public-i18n-aria="openSearch">⌕</button><button class="hia-public-quiet-button" type="button" data-hia-public-locale aria-label="切换到英语界面" data-hia-public-i18n-aria="switchToEnglish">EN</button><button class="hia-public-settings-trigger" type="button" data-hia-settings-open aria-haspopup="dialog" aria-controls="hia-public-settings" aria-label="打开主题与显示设置" data-hia-public-i18n-aria="openSettings"><span aria-hidden="true">◈</span> <span data-hia-public-i18n="settings">主题与设置</span></button></div></header>`
}

/**
 * <lang><zh-CN>读取 owner 生成的公开 project index，并校验其身份与相对页面路由。</zh-CN><en>Reads the owner-generated public project index and validates its identities and relative page routes.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>公开产物根。</zh-CN><en>Public artifact root.</en></lang>
 * @returns {Object} <lang><zh-CN>validated owner index。</zh-CN><en>Validated owner index.</en></lang>
 * @throws {Error} <lang><zh-CN>project index 缺失或路径不安全时抛出。</zh-CN><en>Thrown when the project index is missing or a route is unsafe.</en></lang>
 */
function readPublicProjectIndex(publicRoot) {
  // <lang><zh-CN>projectIndexPath 固定指向公开树的 owner manifest，不接受调用方提供的文件名。</zh-CN><en>ProjectIndexPath is fixed to the owner manifest in the public tree and accepts no caller-provided filename.</en></lang>
  const projectIndexPath = path.join(publicRoot, 'project-index.json')
  if (!fs.existsSync(projectIndexPath)) {
    throw new Error('Default Portal project index is missing.')
  }

  // <lang><zh-CN>projectIndex 只作为可信任生成 JSON 读取，并要求 entry list 存在。</zh-CN><en>ProjectIndex is read as generated JSON and must contain its entry list.</en></lang>
  const projectIndex = JSON.parse(fs.readFileSync(projectIndexPath, 'utf8'))
  if (!Array.isArray(projectIndex.entries)) {
    throw new Error('Default Portal project index has no entry list.')
  }
  return projectIndex
}

/**
 * <lang><zh-CN>按稳定 JSDoc symbol identity 取得唯一公开 entry，并验证 Portal presentation 与无脚本 routes。</zh-CN><en>Finds a unique public entry by stable JSDoc symbol identity and validates its Portal presentation and no-script routes.</en></lang>
 *
 * @param {Object} projectIndex <lang><zh-CN>owner 公开 project index。</zh-CN><en>Owner public project index.</en></lang>
 * @param {string} symbolId <lang><zh-CN>由 BP 项目契约预期的稳定 symbol identity。</zh-CN><en>Stable symbol identity expected by the BP project contract.</en></lang>
 * @param {string} publicRoot <lang><zh-CN>公开产物根，用于 route boundary 校验。</zh-CN><en>Public artifact root used for route-boundary validation.</en></lang>
 * @returns {Object} <lang><zh-CN>带已校验 identity 和 routes 的 owner entry。</zh-CN><en>Owner entry with validated identity and routes.</en></lang>
 * @throws {Error} <lang><zh-CN>entry 不唯一、identity 漂移、presentation 缺失或页面 path 不安全时抛出。</zh-CN><en>Thrown when the entry is ambiguous, its identity drifts, its presentation is missing, or a page path is unsafe.</en></lang>
 */
function findPublicTopicEntry(projectIndex, symbolId, publicRoot) {
  // <lang><zh-CN>matches 使用 JSDoc symbol identity 找目标，不根据标签或文件名猜 route。</zh-CN><en>Matches use JSDoc symbol identity and never guess routes from labels or filenames.</en></lang>
  const matches = projectIndex.entries.filter(
    (entry) => entry.symbolId === symbolId
  )
  if (matches.length !== 1) {
    throw new Error(`Default Portal topic symbol is not unique: ${symbolId}`)
  }

  // <lang><zh-CN>topicEntry 是 owner 页面事实；公开 identity 必须有可路由的 HTML fragment。</zh-CN><en>TopicEntry is an owner page fact; its public identity must have a routable HTML fragment.</en></lang>
  const topicEntry = matches[0]
  if (
    typeof topicEntry.id !== 'string' ||
    !/^jsdoc-integration:[A-Za-z0-9._:-]+$/u.test(topicEntry.id) ||
    typeof topicEntry.presentationPath !== 'string' ||
    typeof topicEntry.contentPath !== 'string' ||
    typeof topicEntry.noScriptPagePath !== 'string'
  ) {
    throw new Error(`Default Portal topic identity is incomplete: ${symbolId}`)
  }

  // <lang><zh-CN>pageRoutes 汇集动态 fragment 与静态 fallback 的 owner 路径；逐一解析可阻止绝对路径和目录穿越。</zh-CN><en>PageRoutes collect the owner paths for dynamic fragments and static fallbacks; resolving each one rejects absolute paths and traversal.</en></lang>
  const pageRoutes = [
    topicEntry.presentationPath,
    topicEntry.contentPath,
    topicEntry.noScriptPagePath,
    ...(Array.isArray(topicEntry.noScriptLocalePages)
      ? topicEntry.noScriptLocalePages.map((page) => page.path)
      : [])
  ]
  for (const route of pageRoutes) {
    resolvePublicHtmlRoute(publicRoot, route)
  }
  return topicEntry
}

/**
 * <lang><zh-CN>将 owner manifest 中的相对 HTML route 约束在公开根内。</zh-CN><en>Constrains a relative HTML route from the owner manifest to the public root.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>公开产物根。</zh-CN><en>Public artifact root.</en></lang>
 * @param {string} route <lang><zh-CN>manifest 提供的相对 HTML route。</zh-CN><en>Relative HTML route supplied by the manifest.</en></lang>
 * @returns {string} <lang><zh-CN>位于 public root 下的绝对文件路径。</zh-CN><en>Absolute file path below the public root.</en></lang>
 * @throws {Error} <lang><zh-CN>route 不安全或目标文件不存在时抛出。</zh-CN><en>Thrown when the route is unsafe or the target file does not exist.</en></lang>
 */
function resolvePublicHtmlRoute(publicRoot, route) {
  if (
    typeof route !== 'string' ||
    !/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9._-]+\.html$/u.test(route)
  ) {
    throw new Error('Default Portal HTML route is not safe.')
  }

  // <lang><zh-CN>candidatePath 由已验证分段解析，并再次校验绝对路径边界。</zh-CN><en>CandidatePath resolves validated segments and is checked again against the absolute path boundary.</en></lang>
  const candidatePath = path.resolve(publicRoot, ...route.split('/'))
  const publicBoundary = `${path.resolve(publicRoot)}${path.sep}`
  if (!candidatePath.startsWith(publicBoundary) || !fs.existsSync(candidatePath)) {
    throw new Error('Default Portal HTML route escaped its public root or is missing.')
  }
  return candidatePath
}

/** @lang zh-CN HTML attribute/text 插值一律先编码，避免 manifest 值被解释为 markup。 @lang en HTML attribute/text interpolation is escaped so manifest values are never interpreted as markup. */
function escapePublicHtml(value) {
  return String(value).replace(/[&<>"']/gu, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[character]
  })
}

/**
 * <lang><zh-CN>渲染可随 owner content locale 切换的双语纯文本。</zh-CN><en>Renders bilingual plain text that follows the owner content locale.</en></lang>
 *
 * @param {{'zh-CN':string,en:string}} value <lang><zh-CN>源 contract 提供的中英文纯文本。</zh-CN><en>Chinese and English plain text from the source contract.</en></lang>
 * @param {'zh-CN'|'en'} [selectedLocale='zh-CN'] <lang><zh-CN>不加载脚本的静态页面首选显示语言；动态 fragment 交给 Portal 内容语言控件继续切换。</zh-CN><en>Preferred language for a no-script static page; dynamic fragments remain switchable by the Portal content-locale control.</en></lang>
 * @returns {string} <lang><zh-CN>两个带 locale 标记且转义后的 span。</zh-CN><en>Two escaped spans marked with their locales.</en></lang>
 */
function renderLocalizedText(value, selectedLocale = 'zh-CN') {
  // <lang><zh-CN>localeVisibility 让 Portal 内容语言控件识别动态节点，同时让无脚本的英/中文页面一开始即可读。</zh-CN><en>LocaleVisibility keeps dynamic nodes compatible with the Portal content-locale control and makes no-script English/Chinese pages readable immediately.</en></lang>
  const chineseVisibility = selectedLocale === 'zh-CN' ? '' : ' hidden'
  const englishVisibility = selectedLocale === 'en' ? '' : ' hidden'
  return `<span data-hia-locale="zh-CN" lang="zh-CN"${chineseVisibility}>${escapePublicHtml(value['zh-CN'])}</span><span data-hia-locale="en" lang="en"${englishVisibility}>${escapePublicHtml(value.en)}</span>`
}

/**
 * <lang><zh-CN>从公开 JSDoc i18n 字段读取参数/返回说明，并要求中英文本都存在。</zh-CN><en>Reads parameter/return descriptions from public JSDoc i18n fields and requires both English and Chinese text.</en></lang>
 *
 * @param {Object} topicEntry <lang><zh-CN>公开 project-index entry。</zh-CN><en>Public project-index entry.</en></lang>
 * @param {string} fieldPath <lang><zh-CN>精确 i18n 字段路径。</zh-CN><en>Exact i18n field path.</en></lang>
 * @returns {{'zh-CN':string,en:string}} <lang><zh-CN>已验证的双语说明。</zh-CN><en>Validated bilingual description.</en></lang>
 * @throws {Error} <lang><zh-CN>字段缺失或任一 locale 文本为空时抛出。</zh-CN><en>Thrown when the field is missing or either locale is empty.</en></lang>
 */
function readLocalizedProjectField(topicEntry, fieldPath) {
  // <lang><zh-CN>localizedText 只能来自公开 JSDoc i18n field，UI 不会重新解释 source body。</zh-CN><en>LocalizedText can only come from a public JSDoc i18n field; the UI never reparses source bodies.</en></lang>
  const localizedText = topicEntry.i18n?.fields?.[fieldPath]?.localizedText
  if (
    typeof localizedText?.['zh-CN'] !== 'string' ||
    typeof localizedText.en !== 'string' ||
    !localizedText['zh-CN'].trim() ||
    !localizedText.en.trim()
  ) {
    throw new Error(`Default Portal bilingual contract field is missing: ${fieldPath}`)
  }
  return localizedText
}

/**
 * <lang><zh-CN>生成 API 主契约正文；metadata、coverage、relations 与 source 仍由独立 section 控制。</zh-CN><en>Generates the primary API contract while metadata, coverage, relations, and source remain independently controlled sections.</en></lang>
 *
 * @param {Object} topicEntry <lang><zh-CN>由公开 project-index 定位的 API entry。</zh-CN><en>API entry resolved from the public project index.</en></lang>
 * @param {'zh-CN'|'en'} [selectedLocale='zh-CN'] <lang><zh-CN>此投影初始显示语言。</zh-CN><en>Initial display language for this projection.</en></lang>
 * @returns {string} <lang><zh-CN>签名、参数、返回、示例与边界 HTML。</zh-CN><en>HTML for signature, parameters, returns, example, and boundaries.</en></lang>
 * @throws {Error} <lang><zh-CN>出现未登记 API 或缺少双语来源字段时抛出。</zh-CN><en>Thrown for an unregistered API or missing bilingual source fields.</en></lang>
 */
function renderPublicApiContract(topicEntry, selectedLocale = 'zh-CN') {
  // <lang><zh-CN>definition 仅允许本产品首页精选的 set/get API contract。</zh-CN><en>Definition permits only the set/get API contracts featured on this product landing.</en></lang>
  const definition = PUBLIC_API_CONTRACTS[topicEntry.symbolId]
  if (!definition) {
    throw new Error(`Default Portal API contract is not registered: ${topicEntry.symbolId}`)
  }

  // <lang><zh-CN>parameterRows 将类型/可选性来自 JSDoc 声明，参数说明来自实际生成的双语 project index。</zh-CN><en>ParameterRows uses JSDoc declarations for types/optionality and bilingual descriptions from the generated project index.</en></lang>
  const parameterRows = definition.parameters
    .map((parameter) => {
      // <lang><zh-CN>description 保持来自公开 JSDoc i18n field 的双语参数语义。</zh-CN><en>Description preserves bilingual parameter semantics from the public JSDoc i18n field.</en></lang>
      const description = readLocalizedProjectField(
        topicEntry,
        parameter.descriptionPath
      )
      // <lang><zh-CN>optionality 标出 contract 声明的必填/可选状态。</zh-CN><en>Optionality marks the contract's required or optional state.</en></lang>
      const optionality = parameter.optional
        ? { 'zh-CN': '可选', en: 'Optional' }
        : { 'zh-CN': '必填', en: 'Required' }
      // <lang><zh-CN>note 只为确有异常边界的参数生成说明。</zh-CN><en>Note is rendered only for parameters with an explicit exceptional boundary.</en></lang>
      const note = parameter.note
        ? `<p class="hia-public-api-note">${renderLocalizedText(parameter.note, selectedLocale)}</p>`
        : ''
      return `<tr><th scope="row"><code>${escapePublicHtml(parameter.name)}</code></th><td><code>${escapePublicHtml(parameter.type)}</code><span class="hia-public-api-optionality">${renderLocalizedText(optionality, selectedLocale)}</span></td><td>${renderLocalizedText(description, selectedLocale)}${note}</td></tr>`
    })
    .join('')

  // <lang><zh-CN>returnDescription 保持 JSDoc 双语事实，不把示例的类型推断覆盖源 contract。</zh-CN><en>ReturnDescription preserves bilingual JSDoc facts and never lets example-based type inference override the source contract.</en></lang>
  const returnDescription = readLocalizedProjectField(
    topicEntry,
    definition.returnDescriptionPath
  )
  const pageId = escapePublicHtml(definition.pageId)

  return `<div class="hia-public-api-contract"><section aria-labelledby="hia-api-${pageId}-signature"><h3 id="hia-api-${pageId}-signature">${renderLocalizedText({ 'zh-CN': '签名', en: 'Signature' }, selectedLocale)}</h3><pre><code>${escapePublicHtml(definition.signature)}</code></pre></section><section aria-labelledby="hia-api-${pageId}-parameters"><h3 id="hia-api-${pageId}-parameters">${renderLocalizedText({ 'zh-CN': '参数', en: 'Parameters' }, selectedLocale)}</h3><div class="hia-public-api-table-scroll"><table><thead><tr><th scope="col">${renderLocalizedText({ 'zh-CN': '名称', en: 'Name' }, selectedLocale)}</th><th scope="col">${renderLocalizedText({ 'zh-CN': '类型', en: 'Type' }, selectedLocale)}</th><th scope="col">${renderLocalizedText({ 'zh-CN': '说明', en: 'Description' }, selectedLocale)}</th></tr></thead><tbody>${parameterRows}</tbody></table></div></section><section aria-labelledby="hia-api-${pageId}-returns"><h3 id="hia-api-${pageId}-returns">${renderLocalizedText({ 'zh-CN': '返回值', en: 'Returns' }, selectedLocale)}</h3><p class="hia-public-api-type"><code>${escapePublicHtml(definition.returnType)}</code></p><p>${renderLocalizedText(returnDescription, selectedLocale)}</p></section><section aria-labelledby="hia-api-${pageId}-examples"><h3 id="hia-api-${pageId}-examples">${renderLocalizedText({ 'zh-CN': '示例', en: 'Examples' }, selectedLocale)}</h3><pre><code>${escapePublicHtml(definition.example)}</code></pre></section><section aria-labelledby="hia-api-${pageId}-behavior"><h3 id="hia-api-${pageId}-behavior">${renderLocalizedText({ 'zh-CN': '行为与边界', en: 'Behavior and boundaries' }, selectedLocale)}</h3><p>${renderLocalizedText(definition.behavior, selectedLocale)}</p></section></div>`
}

/**
 * <lang><zh-CN>将 set/get 契约按 entry identity 投影到 Portal presentation 与无脚本页面。</zh-CN><en>Projects set/get contracts by entry identity into the Portal presentation and no-script pages.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>复制后的公开产物根。</zh-CN><en>Copied public artifact root.</en></lang>
 * @param {Object} topicEntry <lang><zh-CN>公开 project-index 中的目标 entry。</zh-CN><en>Target entry in the public project index.</en></lang>
 * @returns {void}
 * @throws {Error} <lang><zh-CN>目标 article 不唯一或缺少 contract section 时抛出。</zh-CN><en>Thrown when the target article is ambiguous or lacks a contract section.</en></lang>
 */
function patchPublicApiTopic(publicRoot, topicEntry) {
  // <lang><zh-CN>routes 覆盖 owner 实际加载的 semantic presentation、经典 content fragment 与静态 fallback。</zh-CN><en>Routes cover the semantic presentation actually loaded by the owner, the classic content fragment, and static fallbacks.</en></lang>
  const routes = [
    topicEntry.presentationPath,
    topicEntry.contentPath,
    topicEntry.noScriptPagePath,
    ...(Array.isArray(topicEntry.noScriptLocalePages)
      ? topicEntry.noScriptLocalePages.map((page) => page.path)
      : [])
  ]

  for (const route of new Set(routes)) {
    // <lang><zh-CN>topicPath 先经 public-root path guard，写入仅限 manifest 指定的 HTML 页面。</zh-CN><en>TopicPath passes the public-root guard before writing and is limited to HTML pages named by the manifest.</en></lang>
    const topicPath = resolvePublicHtmlRoute(publicRoot, route)
    // <lang><zh-CN>pageHtml 保存一个公开 HTML 投影；不会读取或执行其中的源码正文。</zh-CN><en>PageHtml holds one public HTML projection and never reads or executes documented source bodies.</en></lang>
    let pageHtml = fs.readFileSync(topicPath, 'utf8')
    // <lang><zh-CN>localePage 只为明确登记的静态 locale route 选择初始语言；动态 fragment 与默认 fallback 使用中文起始值。</zh-CN><en>LocalePage selects an initial language only for explicitly registered static locale routes; dynamic fragments and the default fallback start in Chinese.</en></lang>
    const localePage = topicEntry.noScriptLocalePages?.find(
      (page) => page.path === route
    )
    const selectedLocale = localePage?.uiLocale === 'en' ? 'en' : 'zh-CN'
    // <lang><zh-CN>contractMarkup 逐 route 共享同一 contract 事实，仅调整静态页面的初始语言显隐。</zh-CN><en>ContractMarkup shares the same contract facts across routes and changes only initial language visibility for static pages.</en></lang>
    const contractMarkup = renderPublicApiContract(topicEntry, selectedLocale)
    // <lang><zh-CN>escapedIdentity 仅用于在共享 presentation 中精确定位 owner article 的 id 属性。</zh-CN><en>EscapedIdentity is used only to locate the owner article's exact id attribute in a shared presentation.</en></lang>
    const escapedIdentity = topicEntry.id.replace(
      /[.*+?^${}()|[\]\\]/gu,
      '\\$&'
    )
    // <lang><zh-CN>articlePattern 用受校验的 identity 锚定单个 Portal topic，避免改写同一 semantic container 中的 sibling API。</zh-CN><en>ArticlePattern anchors one Portal topic by the validated identity so sibling APIs in the same semantic container remain untouched.</en></lang>
    const articlePattern = new RegExp(
      `<article\\b(?=[^>]*\\bid="${escapedIdentity}")[^>]*>[\\s\\S]*?<\\/article>`,
      'gu'
    )
    // <lang><zh-CN>articleMatches 必须唯一，否则保持 fail closed，避免写错公开 topic。</zh-CN><en>ArticleMatches must be unique; otherwise fail closed to avoid changing the wrong public topic.</en></lang>
    const articleMatches = [...pageHtml.matchAll(articlePattern)]
    if (articleMatches.length !== 1) {
      throw new Error(`Default Portal topic article is not unique: ${route}`)
    }
    // <lang><zh-CN>articleHtml 限制 contract section 的正则替换范围为当前 API article。</zh-CN><en>ArticleHtml limits contract-section replacement to the current API article.</en></lang>
    let articleHtml = articleMatches[0][0]
    // <lang><zh-CN>新版owner补全附加字段后，已在双语契约完整投影的参数/返回不应在签名前重复；未映射字段保留。</zh-CN><en>With the owner's completed additional fields, parameters/returns fully projected in the bilingual contract must not duplicate above the signature; preserve unmapped fields.</en></lang>
    const definition = PUBLIC_API_CONTRACTS[topicEntry.symbolId]
    const coveredFields = new Set([
      ...definition.parameters.map((parameter) => parameter.descriptionPath),
      definition.returnDescriptionPath
    ])
    articleHtml = articleHtml.replace(
      /<div class="hia-i18n-field"><dt>([^<]+)<\/dt><dd>[\s\S]*?<\/dd><\/div>/gu,
      (fieldHtml, fieldPath) => coveredFields.has(fieldPath) ? '' : fieldHtml
    )
    // <lang><zh-CN>空附加字段容器整体省略；存在未映射说明时仍使用现有组件，按当前内容语言提供标题。</zh-CN><en>Omit empty additional-field containers; keep the existing component for unmapped prose, with a heading in the current content language.</en></lang>
    articleHtml = articleHtml.replace(
      /<section class="hia-i18n-fields"><h3>Localized Fields<\/h3><dl>([\s\S]*?)<\/dl><\/section>/gu,
      (sectionHtml, fieldsHtml) => fieldsHtml.trim()
        ? sectionHtml.replace('Localized Fields', renderLocalizedText({ 'zh-CN': '附加说明', en: 'Additional documentation' }, selectedLocale))
        : ''
    )
    // <lang><zh-CN>sectionMatch 锁定当前 article 的 owner contract details，保留原生 summary 与 disclosure 语义。</zh-CN><en>SectionMatch locates the owner contract details in the current article while preserving its native summary and disclosure semantics.</en></lang>
    const sectionMatch = articleHtml.match(
      /(<details\b[^>]*\bdata-hia-topic-section="contract"[^>]*>)([\s\S]*?)(<\/details>)/u
    )
    const summary = sectionMatch?.[2].match(
      /<summary\b[^>]*>[\s\S]*?<\/summary>/u
    )?.[0]
    if (!sectionMatch || !summary) {
      throw new Error(`Default Portal contract section is missing: ${route}`)
    }

    // <lang><zh-CN>openingTag 默认打开主 contract；其他 section 的独立默认状态不变。</zh-CN><en>OpeningTag opens the primary contract by default while leaving other sections' independent defaults unchanged.</en></lang>
    const openingTag = /\sopen(?:\s|>)/u.test(sectionMatch[1])
      ? sectionMatch[1]
      : `${sectionMatch[1].slice(0, -1)} open>`
    const replacement = `${openingTag}${summary}<div class="hia-project-topic-section-body hia-public-api-contract-host">${contractMarkup}</div>${sectionMatch[3]}`
    articleHtml = articleHtml.replace(sectionMatch[0], replacement)
    pageHtml = pageHtml.replace(articleMatches[0][0], articleHtml)

    if (route.startsWith('pages/')) {
      // <lang><zh-CN>静态页面在 no-script 下需保留一致的 API 阅读样式，不加载任何运行时脚本。</zh-CN><en>Static pages retain the API reading styles without loading runtime scripts in no-script mode.</en></lang>
      const assetRoute = path.posix.relative(
        path.posix.dirname(route),
        'assets/hia-public-product.css'
      )
      pageHtml = pageHtml.replace(
        /<html\b([^>]*)>/u,
        (openingHtml, attributes) => {
          // <lang><zh-CN>existingClass 保留 owner 页面原有 class。</zh-CN><en>ExistingClass preserves classes already supplied by the owner page.</en></lang>
          const existingClass = attributes.match(/\bclass="([^"]*)"/u)?.[1]
          if (existingClass) {
            // <lang><zh-CN>classes 幂等添加 no-js，不重复覆盖或丢弃原 class。</zh-CN><en>Classes idempotently add no-js without replacing or discarding owner classes.</en></lang>
            const classes = new Set(existingClass.split(/\s+/u))
            classes.add('no-js')
            return openingHtml.replace(
              /\bclass="[^"]*"/u,
              `class="${escapePublicHtml([...classes].join(' '))}"`
            )
          }
          return `<html class="no-js"${attributes}>`
        }
      )
      pageHtml = pageHtml.replace(
        '</head>',
        `<link rel="stylesheet" href="${escapePublicHtml(assetRoute)}"></head>`
      )
    }
    fs.writeFileSync(topicPath, pageHtml, 'utf8')
  }
}

/**
 * <lang><zh-CN>生成默认公开 landing；API 链接来自真实生成的多页 route。</zh-CN><en>Generates the default public landing with API links sourced from real generated multi-page routes.</en></lang>
 *
 * @param {string} setRoute <lang><zh-CN>Cookies.set() route。</zh-CN><en>Cookies.set() route.</en></lang>
 * @param {string} getRoute <lang><zh-CN>Cookies.get() route。</zh-CN><en>Cookies.get() route.</en></lang>
 * @returns {string} <lang><zh-CN>可在无脚本模式阅读的 landing article。</zh-CN><en>Landing article readable without scripts.</en></lang>
 */
function renderPublicLanding(setTopic, getTopic) {
  // <lang><zh-CN>set/get routes 来自公开 project-index，并作为无脚本 fallback 与 JS 深链的相同 identity。</zh-CN><en>Set/get routes come from the public project index and provide the same identities for no-script fallbacks and JS deep links.</en></lang>
  const setRoute = escapePublicHtml(setTopic.noScriptPagePath)
  const getRoute = escapePublicHtml(getTopic.noScriptPagePath)
  const setIdentity = escapePublicHtml(setTopic.id)
  const getIdentity = escapePublicHtml(getTopic.id)

  return `<article class="hia-public-landing">
  <header class="hia-public-hero">
    <p class="hia-public-eyebrow" data-hia-public-i18n="landingEyebrow">浏览器 Cookie 工具库</p>
    <h1 data-hia-public-i18n="landingTitle">轻量、明确地管理 Cookie。</h1>
    <p class="hia-public-lede" data-hia-public-i18n="landingLede">js-cookie 提供熟悉、无依赖的浏览器 API。这里从一个默认、多页、可追溯的 Portal 开始阅读。</p>
    <div class="hia-public-hero-meta" data-hia-content-section="metadata"><span>JavaScript</span><span>v3.0.8</span><span>MIT</span><span data-hia-public-i18n="browser">浏览器</span></div>
    <div class="hia-public-hero-actions"><a class="hia-public-primary-action" href="#hia-public-start" data-hia-public-i18n="startCta">快速开始</a><a class="hia-public-secondary-action" href="#hia-public-api" data-hia-public-i18n="apiCta">浏览 API</a></div>
  </header>
  <section aria-labelledby="hia-public-start-title">
    <h2 id="hia-public-start-title" data-hia-public-i18n="installTitle">安装</h2>
    <p data-hia-public-i18n="installIntro">使用包管理器安装，或从 ESM 入口导入。</p>
    <pre><code>npm install js-cookie</code></pre>
    <p><code>import Cookies from 'js-cookie'</code></p>
  </section>
  <section aria-labelledby="hia-public-quickstart-title">
    <h2 id="hia-public-quickstart-title" data-hia-public-i18n="quickStartTitle">第一段代码</h2>
    <p data-hia-public-i18n="quickStartIntro">写入、读取，再按同一作用域删除 Cookie。</p>
    <pre><code>import Cookies from 'js-cookie'\n\nCookies.set('theme', 'dark', { expires: 7, sameSite: 'lax' })\nCookies.get('theme')\nCookies.remove('theme')</code></pre>
  </section>
  <section aria-labelledby="hia-public-api-title" data-hia-content-section="contract">
    <h2 id="hia-public-api-title" data-hia-public-i18n="apiTitle">核心 API</h2>
    <p data-hia-public-i18n="apiIntro">按任务进入独立 reference 页面，在统一 Portal 中查看完整契约。</p>
    <div class="hia-public-card-grid">
      <a class="hia-public-card" href="${setRoute}" data-hia-public-entry="${setIdentity}"><strong><code>Cookies.set()</code></strong><p data-hia-public-i18n="setCardDescription">写入值，并显式控制 expires、path、domain、secure 与 sameSite。</p></a>
      <a class="hia-public-card" href="${getRoute}" data-hia-public-entry="${getIdentity}"><strong><code>Cookies.get()</code></strong><p data-hia-public-i18n="getCardDescription">读取指定名称，或取得当前文档可见的 Cookie 值。</p></a>
      <a class="hia-public-card" href="pages/index.html"><strong data-hia-public-i18n="apiIndexTitle">完整 API 索引</strong><p data-hia-public-i18n="apiIndexDescription">默认显示 7 个公开 API；可在设置中切换查看全部 18 个文档节点。</p></a>
    </div>
  </section>
  <section aria-labelledby="hia-public-provenance" data-hia-content-section="provenance">
    <h2 id="hia-public-provenance" data-hia-public-i18n="provenanceTitle">文档与源码溯源</h2>
    <dl class="hia-public-meta"><dt data-hia-public-i18n="upstreamVersion">上游版本</dt><dd>js-cookie v3.0.8</dd><dt data-hia-public-i18n="publicProfile">公开 profile</dt><dd><code>unified-portal / fetch / classic</code></dd><dt data-hia-public-i18n="sourceMode">源码模式</dt><dd>same-origin · fetch-on-expand · verified before highlight</dd><dt data-hia-public-i18n="license">许可证</dt><dd>MIT</dd></dl>
  </section>
</article>`
}

/**
 * <lang><zh-CN>生成主内容外围的移动 disclosure、breadcrumb、outline 与 footer。</zh-CN><en>Generates mobile disclosures, breadcrumb, outline, and footer around main content.</en></lang>
 *
 * @returns {{beforeMain:string,afterMain:string}} <lang><zh-CN>主节点前后 fragments。</zh-CN><en>Fragments before and after the main node.</en></lang>
 */
function renderPublicStructure(setTopic, getTopic) {
  // <lang><zh-CN>staticNavigation 让无脚本首页保留概览、set 与 get 原生链接。</zh-CN><en>StaticNavigation preserves native overview, set, and get links on the no-script landing.</en></lang>
  const staticNavigation = `<nav aria-label="静态文档导航"><ul><li><a href="./">概览</a></li><li><a href="${escapePublicHtml(setTopic.noScriptPagePath)}" data-hia-public-entry="${escapePublicHtml(setTopic.id)}">Cookies.set()</a></li><li><a href="${escapePublicHtml(getTopic.noScriptPagePath)}" data-hia-public-entry="${escapePublicHtml(getTopic.id)}">Cookies.get()</a></li></ul></nav>`
  return {
    beforeMain: `<div class="hia-public-content-column"><details class="hia-public-mobile-navigation" data-hia-public-mobile-navigation><summary data-hia-public-i18n="nav">文档目录</summary><div data-hia-public-mobile-navigation-host>${staticNavigation}</div></details><nav class="hia-public-breadcrumb" aria-label="面包屑" data-hia-public-i18n-aria="breadcrumbAccessible"><a href="./">js-cookie</a><span aria-hidden="true">/</span><span data-hia-public-breadcrumb-current data-hia-public-i18n="breadcrumb">概览</span></nav><details class="hia-public-mobile-outline"><summary data-hia-public-i18n="outline">本页内容</summary><nav data-hia-public-mobile-outline-list></nav></details>`,
    afterMain: `<footer class="hia-public-footer" data-hia-public-footer><a href="pages/index.html" data-hia-public-i18n="pageIndex">完整页面索引</a><a href="#hia-public-main" data-hia-public-i18n="backToContent">返回正文顶部</a></footer></div><aside class="hia-public-outline" data-hia-public-outline aria-label="本页内容" data-hia-public-i18n-aria="outline"><p class="hia-public-outline-label" data-hia-public-i18n="outline">本页内容</p><nav data-hia-public-outline-list></nav></aside>`
  }
}

/**
 * <lang><zh-CN>生成只保存设备显示偏好的原生设置对话框。</zh-CN><en>Generates a native settings dialog that stores only device display preferences.</en></lang>
 *
 * @returns {string} <lang><zh-CN>设置 HTML。</zh-CN><en>Settings HTML.</en></lang>
 */
function renderSettingsDialog() {
  return `<dialog class="hia-public-settings-dialog" id="hia-public-settings" data-hia-settings-dialog aria-labelledby="hia-public-settings-title">
  <div class="hia-public-settings-header"><div><small>js-cookie · Portal</small><h2 id="hia-public-settings-title" data-hia-public-i18n="settingsTitle">主题、内容与代码设置</h2></div><button class="hia-public-quiet-button" type="button" data-hia-settings-close><span data-hia-public-i18n="close">关闭</span></button></div>
  <div class="hia-public-settings-body">
    <fieldset><legend data-hia-public-i18n="apiScope">API 显示范围</legend><div class="hia-public-theme-choices"><label><input type="radio" name="api-scope" value="public" data-hia-preference="apiScope"> <span data-hia-public-i18n="publicApi">只显示接口 API</span></label><label><input type="radio" name="api-scope" value="all" data-hia-preference="apiScope"> <span data-hia-public-i18n="allApi">显示全部 API</span></label></div></fieldset>
    <fieldset><legend data-hia-public-i18n="contentVisibility">内容显隐</legend><div class="hia-public-visibility-grid"><label><input type="checkbox" data-hia-preference="metadata"> <span data-hia-public-i18n="metadata">元数据</span></label><label><input type="checkbox" data-hia-preference="contract"> <span data-hia-public-i18n="contract">契约</span></label><label><input type="checkbox" data-hia-preference="coverage"> <span data-hia-public-i18n="coverage">覆盖情况</span></label><label><input type="checkbox" data-hia-preference="provenance"> <span data-hia-public-i18n="provenance">溯源</span></label><label><input type="checkbox" data-hia-preference="relations"> <span data-hia-public-i18n="relations">项目关系</span></label></div></fieldset>
    <fieldset><legend data-hia-public-i18n="siteTheme">站点主题</legend><div class="hia-public-theme-choices"><label><input type="radio" name="site-theme" value="system" data-hia-preference="siteTheme"> <span data-hia-public-i18n="themeSystem">跟随系统</span></label><label><input type="radio" name="site-theme" value="light" data-hia-preference="siteTheme"> <span data-hia-public-i18n="themeLight">浅色</span></label><label><input type="radio" name="site-theme" value="dark" data-hia-preference="siteTheme"> <span data-hia-public-i18n="themeDark">深色</span></label></div></fieldset>
    <fieldset><legend data-hia-public-i18n="codeSettings">代码区域 / 编辑器设置</legend><div class="hia-public-settings-grid"><label class="hia-public-settings-field"><span data-hia-public-i18n="codeTheme">代码主题</span><select data-hia-preference="codeTheme"><option value="site" data-hia-public-i18n="codeThemeSite">跟随站点</option><option value="paper-light">Paper Light</option><option value="midnight">Midnight</option><option value="solarized-light">Solarized Light</option><option value="solarized-dark">Solarized Dark</option><option value="high-contrast" data-hia-public-i18n="codeThemeContrast">高对比度</option></select></label><label class="hia-public-settings-field"><span data-hia-public-i18n="codeSize">代码字号</span><select data-hia-preference="codeFontSize"><option value="small" data-hia-public-i18n="sizeSmall">小</option><option value="default" data-hia-public-i18n="sizeDefault">默认</option><option value="large" data-hia-public-i18n="sizeLarge">大</option></select></label></div><div class="hia-public-toggle-row"><label><span data-hia-public-i18n="codeWrap">长行换行</span><select data-hia-preference="codeWrap"><option value="scroll" data-hia-public-i18n="wrapScroll">横向滚动</option><option value="wrap" data-hia-public-i18n="wrapAutomatic">自动换行</option></select></label><label><span data-hia-public-i18n="lineNumbers">行号</span><select data-hia-preference="codeLines"><option value="hide" data-hia-public-i18n="hide">隐藏</option><option value="show" data-hia-public-i18n="show">显示</option></select></label></div><pre class="hia-public-settings-preview line-numbers"><code class="language-javascript">const cookie = Cookies.get('theme')\nCookies.set('theme', cookie ?? 'system')</code></pre><p class="hia-public-highlighter-note" data-hia-public-i18n="highlighterNote">源码须先通过字节数与 SHA-384 校验，再进行本地语法高亮；失败时保留纯文本。</p></fieldset>
    <fieldset><legend data-hia-public-i18n="reading">阅读设置</legend><label class="hia-public-settings-field"><span data-hia-public-i18n="contentWidth">正文宽度</span><select data-hia-preference="contentWidth"><option value="comfortable" data-hia-public-i18n="widthComfortable">舒适</option><option value="wide" data-hia-public-i18n="widthWide">宽幅</option></select></label></fieldset>
  </div>
  <div class="hia-public-settings-footer"><div><p class="hia-public-settings-privacy" data-hia-public-i18n="privacy">仅保存显示偏好；不关联账号、不发送分析数据。</p><span data-hia-settings-status aria-live="polite"></span></div><button class="hia-public-secondary-button" type="button" data-hia-settings-reset><span data-hia-public-i18n="reset">恢复默认</span></button></div>
</dialog>`
}

/**
 * <lang><zh-CN>生成确认稿中的原生搜索 dialog，并把结果链接绑定到真实多页 route。</zh-CN><en>Generates the confirmed native search dialog with result links bound to real multi-page routes.</en></lang>
 *
 * @param {string} setRoute <lang><zh-CN>Cookies.set() route。</zh-CN><en>Cookies.set() route.</en></lang>
 * @param {string} getRoute <lang><zh-CN>Cookies.get() route。</zh-CN><en>Cookies.get() route.</en></lang>
 * @returns {string} <lang><zh-CN>不读取额外索引的搜索 HTML。</zh-CN><en>Search HTML that reads no additional index.</en></lang>
 */
function renderSearchDialog(setTopic, getTopic) {
  return `<dialog class="hia-public-search-dialog" id="hia-public-search" data-hia-search-dialog aria-labelledby="hia-public-search-title"><div class="hia-public-search-header"><input type="search" data-hia-search-input data-hia-public-i18n-placeholder="searchPlaceholder" placeholder="搜索 API 或指南…" aria-labelledby="hia-public-search-title"><button class="hia-public-quiet-button" type="button" data-hia-search-close><span data-hia-public-i18n="searchClose">关闭</span></button></div><h2 class="hia-public-visually-hidden" id="hia-public-search-title" data-hia-public-i18n="searchTitle">搜索文档</h2><ul class="hia-public-search-results"><li data-hia-search-result><a href="./"><strong data-hia-public-i18n="overview">概览</strong><small data-hia-public-i18n="searchOverview">项目概览与快速开始</small></a></li><li data-hia-search-result><a href="${escapePublicHtml(setTopic.noScriptPagePath)}" data-hia-public-entry="${escapePublicHtml(setTopic.id)}"><strong>Cookies.set()</strong><small data-hia-public-i18n="searchSet">Cookies.set() · 写入 Cookie</small></a></li><li data-hia-search-result><a href="${escapePublicHtml(getTopic.noScriptPagePath)}" data-hia-public-entry="${escapePublicHtml(getTopic.id)}"><strong>Cookies.get()</strong><small data-hia-public-i18n="searchGet">Cookies.get() · 读取 Cookie</small></a></li></ul><p class="hia-public-search-empty" data-hia-search-empty data-hia-public-i18n="searchEmpty" hidden>没有匹配结果</p></dialog>`
}

/**
 * <lang><zh-CN>把确认的 BP 产品结构注入默认 Portal 根，并复制同源产品资产。</zh-CN><en>Injects the confirmed BP product structure into the default Portal root and copies same-origin product assets.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>已复制的公开根。</zh-CN><en>Copied public root.</en></lang>
 * @returns {void}
 * @throws {Error} <lang><zh-CN>owner 输出缺少预期语义锚点时 fail closed。</zh-CN><en>Fails closed when owner output lacks expected semantic anchors.</en></lang>
 */
function enhancePublicPortal(publicRoot) {
  const indexPath = path.join(publicRoot, 'index.html')
  let html = fs.readFileSync(indexPath, 'utf8')
  const requiredMarkers = [
    '<head>',
    '<body>',
    'data-hia-project-content',
    '<p class="hia-project-empty">',
    '</main></div><script src="assets/hia-default.js"'
  ]
  for (const marker of requiredMarkers) {
    if (!html.includes(marker)) {
      throw new Error(`Default Portal output lacks product anchor: ${marker}`)
    }
  }

  // <lang><zh-CN>空状态锚点兼容旧纯文本节点与 W-P125 owner 消息 span；它只界定受控替换范围，不吞并相邻 markup。</zh-CN><en>The empty-state anchor accepts both the legacy text node and the W-P125 owner message span; it bounds the controlled replacement without consuming adjacent markup.</en></lang>
  const emptyStatePattern =
    /<p class="hia-project-empty">(?:<span data-hia-ui-message="portal\.navigation\.select">[^<]*<\/span>|[^<]*)<\/p>/u
  if (!emptyStatePattern.test(html)) {
    throw new Error('Default Portal output lacks the supported empty-state shape.')
  }

  // <lang><zh-CN>先确定性改写导航 shard，使 public/all scope 在首屏树加载前已成立。</zh-CN><en>Rewrite the navigation shard deterministically first so public/all scope exists before the initial tree load.</en></lang>
  groupApiScopeNavigation(publicRoot)
  // <lang><zh-CN>projectIndex 选择 owner 已发布的稳定 set/get identity 和真实的 no-script fallback route。</zh-CN><en>ProjectIndex selects owner-published stable set/get identities and their real no-script fallback routes.</en></lang>
  const projectIndex = readPublicProjectIndex(publicRoot)
  const setTopic = findPublicTopicEntry(
    projectIndex,
    FEATURED_API_SYMBOLS.set,
    publicRoot
  )
  const getTopic = findPublicTopicEntry(
    projectIndex,
    FEATURED_API_SYMBOLS.get,
    publicRoot
  )
  // <lang><zh-CN>contract projection 同步更新 Portal fragment 与静态 fallback 页面，但不改写 owner index 或源码。</zh-CN><en>ContractProjection updates Portal fragments and static fallbacks without rewriting the owner index or source.</en></lang>
  patchPublicApiTopic(publicRoot, setTopic)
  patchPublicApiTopic(publicRoot, getTopic)
  // <lang><zh-CN>structure 同时服务 interactive Portal 和 no-script 原生导航。</zh-CN><en>Structure serves both the interactive Portal and its no-script native navigation.</en></lang>
  const structure = renderPublicStructure(setTopic, getTopic)
  html = html
    .replace(
      '<html ',
      '<html class="no-js" data-hia-api-scope="public" data-hia-show-metadata="hide" data-hia-show-contract="show" data-hia-show-coverage="hide" data-hia-show-provenance="show" data-hia-show-relations="hide" data-hia-code-theme="site" data-hia-code-font-size="default" data-hia-code-wrap="scroll" data-hia-code-lines="show" data-hia-content-width="comfortable" '
    )
    .replace('data-hia-scheme="system"', 'data-hia-scheme="light"')
    .replace(
      '</head>',
      '<link rel="stylesheet" href="assets/hia-public-product.css"></head>'
    )
    .replace('<body>', `<body>${renderPublicHeader()}`)
    .replace(
      /(<main\b[^>]*data-hia-project-content[^>]*)(>)/u,
      `${structure.beforeMain}$1 id="hia-public-main"$2`
    )
    .replace(
      emptyStatePattern,
      renderPublicLanding(setTopic, getTopic)
    )
    .replace(
      '</main></div><script src="assets/hia-default.js"',
      `</main>${structure.afterMain}</div>${renderSettingsDialog()}${renderSearchDialog(setTopic, getTopic)}<script src="assets/hia-default.js"`
    )
    .replace(
      '</body>',
      '<script>window.Prism=window.Prism||{};window.Prism.manual=true;</script><script defer src="assets/prism.js"></script><script defer src="assets/prism-line-numbers.js"></script><script defer src="assets/hia-public-product.js"></script></body>'
    )

  fs.writeFileSync(indexPath, html, 'utf8')
  const assetRoot = path.join(publicRoot, 'assets')
  fs.copyFileSync(
    path.join(moduleDirectory, 'public-product.css'),
    path.join(assetRoot, 'hia-public-product.css')
  )
  fs.copyFileSync(
    path.join(moduleDirectory, 'public-product.js'),
    path.join(assetRoot, 'hia-public-product.js')
  )
  // <lang><zh-CN>Prism 运行时与许可证从 exact-pinned 私有 tooling 依赖复制到同源公开资产。</zh-CN><en>The Prism runtime and license are copied from the exact-pinned private tooling dependency into same-origin public assets.</en></lang>
  const prismPackage = JSON.parse(
    fs.readFileSync(path.join(prismRoot, 'package.json'), 'utf8')
  )
  if (prismPackage.version !== '1.30.0' || prismPackage.license !== 'MIT') {
    throw new Error('Pinned Prism runtime identity drifted.')
  }
  fs.copyFileSync(
    path.join(prismRoot, 'prism.js'),
    path.join(assetRoot, 'prism.js')
  )
  fs.copyFileSync(
    path.join(prismRoot, 'plugins', 'line-numbers', 'prism-line-numbers.js'),
    path.join(assetRoot, 'prism-line-numbers.js')
  )
  fs.copyFileSync(
    path.join(prismRoot, 'LICENSE'),
    path.join(assetRoot, 'prism-LICENSE.txt')
  )
}

/**
 * <lang><zh-CN>验证待复制树只含普通文件和目录，并返回文件数。</zh-CN><en>Validates that the source tree contains only regular files and directories, returning its file count.</en></lang>
 *
 * @param {string} root <lang><zh-CN>默认 Portal surface 绝对根。</zh-CN><en>Absolute root of the default Portal surface.</en></lang>
 * @returns {number} <lang><zh-CN>普通文件数。</zh-CN><en>Regular-file count.</en></lang>
 * @throws {Error} <lang><zh-CN>遇到 link 或特殊文件时抛出。</zh-CN><en>Thrown on a link or special file.</en></lang>
 */
function validateSourceTree(root) {
  let fileCount = 0
  /**
   * <lang><zh-CN>递归验证一个目录，绝不跟随 link。</zh-CN><en>Recursively validates one directory without ever following links.</en></lang>
   *
   * @param {string} current <lang><zh-CN>当前目录。</zh-CN><en>Current directory.</en></lang>
   * @returns {void}
   */
  const visit = (current) => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, 'en'))
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      const status = fs.lstatSync(entryPath)
      if (status.isSymbolicLink()) {
        throw new Error('Default Portal tree contains a symbolic link.')
      }
      if (status.isDirectory()) {
        visit(entryPath)
      } else if (status.isFile()) {
        fileCount += 1
      } else {
        throw new Error('Default Portal tree contains a special file.')
      }
    }
  }
  visit(root)
  return fileCount
}

/**
 * <lang><zh-CN>把已验证树逐文件复制到新的公开根。</zh-CN><en>Copies a validated tree file by file into the new public root.</en></lang>
 *
 * @param {string} sourceRoot <lang><zh-CN>默认 surface 根。</zh-CN><en>Default surface root.</en></lang>
 * @param {string} destinationRoot <lang><zh-CN>公开 artifact 根。</zh-CN><en>Public artifact root.</en></lang>
 * @returns {void}
 */
function copyTree(sourceRoot, destinationRoot) {
  fs.mkdirSync(destinationRoot, { recursive: true })
  const entries = fs
    .readdirSync(sourceRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name)
    const destinationPath = path.join(destinationRoot, entry.name)
    if (entry.isDirectory()) copyTree(sourcePath, destinationPath)
    else fs.copyFileSync(sourcePath, destinationPath)
  }
}

/**
 * <lang><zh-CN>重建公开根并只复制默认 Portal surface。</zh-CN><en>Rebuilds the public root and copies only the default Portal surface.</en></lang>
 *
 * @param {{buildCommit:string,defaultRoot:string,publicRoot:string}} options <lang><zh-CN>commit 与两个绝对、互不重叠的目录。</zh-CN><en>Commit and two absolute, non-overlapping directories.</en></lang>
 * @returns {{manifest:Object,copiedFileCount:number}} <lang><zh-CN>公开 manifest 与复制计数。</zh-CN><en>Public manifest and copied-file count.</en></lang>
 * @throws {Error} <lang><zh-CN>目录缺失、重叠、目标过宽或 source tree 不安全时抛出。</zh-CN><en>Thrown for missing, overlapping, overly broad, or unsafe trees.</en></lang>
 */
export function materializePublicArtifact({
  buildCommit,
  defaultRoot,
  publicRoot
}) {
  const resolvedDefaultRoot = path.resolve(defaultRoot)
  const resolvedPublicRoot = path.resolve(publicRoot)
  if (!path.isAbsolute(defaultRoot) || !path.isAbsolute(publicRoot)) {
    throw new Error('Public artifact roots must be absolute.')
  }
  if (
    path.basename(resolvedPublicRoot) !== 'public' ||
    path.dirname(resolvedPublicRoot) === path.parse(resolvedPublicRoot).root
  ) {
    throw new Error('Public artifact destination is outside the safe boundary.')
  }
  const relativeDestination = path.relative(
    resolvedDefaultRoot,
    resolvedPublicRoot
  )
  const relativeSource = path.relative(resolvedPublicRoot, resolvedDefaultRoot)
  if (
    relativeDestination === '' ||
    (!relativeDestination.startsWith('..') &&
      !path.isAbsolute(relativeDestination)) ||
    (!relativeSource.startsWith('..') && !path.isAbsolute(relativeSource))
  ) {
    throw new Error('Public artifact source and destination must not overlap.')
  }
  if (
    !fs.existsSync(path.join(resolvedDefaultRoot, 'index.html')) ||
    !fs.statSync(resolvedDefaultRoot).isDirectory()
  ) {
    throw new Error('Default Portal source tree is missing its index.')
  }

  const copiedFileCount = validateSourceTree(resolvedDefaultRoot)
  const manifest = createPublicArtifactManifest({ buildCommit })
  fs.rmSync(resolvedPublicRoot, { recursive: true, force: true })
  copyTree(resolvedDefaultRoot, resolvedPublicRoot)
  enhancePublicPortal(resolvedPublicRoot)
  fs.writeFileSync(
    path.join(resolvedPublicRoot, 'documentation-publication-profile.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8'
  )
  return { manifest, copiedFileCount }
}

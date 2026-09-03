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
      sourcePresentation: 'same-origin-fetch-on-expand'
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
 * <lang><zh-CN>把 owner 的平铺 package 导航确定性分组为公开 API 与内部实现。</zh-CN><en>Deterministically groups the owner's flat package navigation into public APIs and internal implementation.</en></lang>
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
  return `<a class="hia-public-skip" href="#hia-public-main">跳到正文 / Skip to content</a><header class="hia-public-header" data-hia-public-product><a class="hia-public-brand" href="./" aria-label="js-cookie documentation home"><span class="hia-public-brand-mark" aria-hidden="true">JS</span><span class="hia-public-brand-copy"><strong>js-cookie</strong><small>HIA Documentation Portal</small></span></a><button class="hia-public-search-trigger" type="button" data-hia-public-search aria-haspopup="dialog" aria-controls="hia-public-search"><span data-hia-public-i18n="search">搜索文档</span> <kbd>Ctrl K</kbd></button><div class="hia-public-header-actions"><span class="hia-public-version">v3.0.8</span><button class="hia-public-quiet-button hia-public-mobile-search" type="button" data-hia-public-search aria-haspopup="dialog" aria-controls="hia-public-search" aria-label="打开文档搜索">⌕</button><button class="hia-public-quiet-button" type="button" data-hia-public-locale aria-label="Switch documentation language">EN</button><button class="hia-public-settings-trigger" type="button" data-hia-settings-open aria-haspopup="dialog" aria-controls="hia-public-settings"><span aria-hidden="true">◈</span> <span data-hia-public-i18n="settings">主题与设置</span></button></div></header>`
}

/**
 * <lang><zh-CN>寻找生成器提供的稳定 no-script topic route。</zh-CN><en>Finds a stable no-script topic route supplied by the generator.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>公开产物根。</zh-CN><en>Public artifact root.</en></lang>
 * @param {string} token <lang><zh-CN>受控文件名 token。</zh-CN><en>Controlled filename token.</en></lang>
 * @returns {string} <lang><zh-CN>Pages-root 相对 route。</zh-CN><en>Route relative to the Pages root.</en></lang>
 */
function findTopicRoute(publicRoot, token) {
  const pagesRoot = path.join(publicRoot, 'pages')
  const fileName = fs
    .readdirSync(pagesRoot)
    .filter((candidate) => candidate.endsWith('.html'))
    .sort((left, right) => left.localeCompare(right, 'en'))
    .find((candidate) => candidate.includes(token))
  return fileName ? `pages/${fileName}` : 'pages/index.html'
}

/**
 * <lang><zh-CN>生成默认公开 landing；API 链接来自真实生成的多页 route。</zh-CN><en>Generates the default public landing with API links sourced from real generated multi-page routes.</en></lang>
 *
 * @param {string} setRoute <lang><zh-CN>Cookies.set() route。</zh-CN><en>Cookies.set() route.</en></lang>
 * @param {string} getRoute <lang><zh-CN>Cookies.get() route。</zh-CN><en>Cookies.get() route.</en></lang>
 * @returns {string} <lang><zh-CN>可在无脚本模式阅读的 landing article。</zh-CN><en>Landing article readable without scripts.</en></lang>
 */
function renderPublicLanding(setRoute, getRoute) {
  return `<article class="hia-public-landing"><header><p class="hia-public-eyebrow">浏览器 Cookie 工具库 / Browser Cookie utility</p><h1>轻量、明确地管理 Cookie。</h1><p class="hia-public-lede">以真实 js-cookie v3.0.8 源码和双语注释生成的多页 API 文档；默认按需读取同源源码，不执行源码正文。</p></header><section aria-labelledby="hia-public-start"><h2 id="hia-public-start">安装与开始 / Install and start</h2><pre><code>npm install js-cookie</code></pre><p><code>import Cookies from 'js-cookie'</code></p></section><section aria-labelledby="hia-public-api"><h2 id="hia-public-api">核心 API / Core API</h2><div class="hia-public-card-grid"><a class="hia-public-card" href="${setRoute}"><strong><code>Cookies.set()</code></strong><p>写入值，并显式控制 expires、path、domain、secure 与 sameSite。</p></a><a class="hia-public-card" href="${getRoute}"><strong><code>Cookies.get()</code></strong><p>读取指定名称，或取得当前文档可见的全部 Cookie。</p></a><a class="hia-public-card" href="pages/index.html"><strong>完整 API 索引</strong><p>默认显示 7 个公开 API；可在设置中切换查看全部 18 个文档节点。</p></a></div></section><section aria-labelledby="hia-public-provenance" data-hia-content-section="provenance"><h2 id="hia-public-provenance">文档与源码溯源 / Provenance</h2><dl class="hia-public-meta"><dt>上游版本</dt><dd>js-cookie v3.0.8</dd><dt>公开 profile</dt><dd><code>unified-portal / fetch / classic</code></dd><dt>源码模式</dt><dd>same-origin · fetch-on-expand · verified before highlight</dd><dt>许可证</dt><dd>MIT</dd></dl></section></article>`
}

/**
 * <lang><zh-CN>生成主内容外围的移动 disclosure、breadcrumb、outline 与 footer。</zh-CN><en>Generates mobile disclosures, breadcrumb, outline, and footer around main content.</en></lang>
 *
 * @returns {{beforeMain:string,afterMain:string}} <lang><zh-CN>主节点前后 fragments。</zh-CN><en>Fragments before and after the main node.</en></lang>
 */
function renderPublicStructure() {
  return {
    beforeMain: `<div class="hia-public-content-column"><details class="hia-public-mobile-navigation" data-hia-public-mobile-navigation><summary data-hia-public-i18n="nav">文档目录</summary><div data-hia-public-mobile-navigation-host></div></details><nav class="hia-public-breadcrumb" aria-label="Breadcrumb"><a href="./">js-cookie</a><span aria-hidden="true">/</span><span data-hia-public-breadcrumb-current data-hia-public-i18n="breadcrumb">概览</span></nav><details class="hia-public-mobile-outline"><summary data-hia-public-i18n="outline">本页内容</summary><nav data-hia-public-mobile-outline-list></nav></details>`,
    afterMain: `<footer class="hia-public-footer" data-hia-public-footer><a href="pages/index.html">完整页面索引 / Page index</a><a href="#hia-public-main">返回正文顶部 / Back to content</a></footer></div><aside class="hia-public-outline" data-hia-public-outline aria-label="On this page"><p class="hia-public-outline-label" data-hia-public-i18n="outline">本页内容</p><nav data-hia-public-outline-list></nav></aside>`
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
function renderSearchDialog(setRoute, getRoute) {
  return `<dialog class="hia-public-search-dialog" id="hia-public-search" data-hia-search-dialog aria-labelledby="hia-public-search-title"><div class="hia-public-search-header"><input type="search" data-hia-search-input data-hia-public-i18n-placeholder="searchPlaceholder" placeholder="搜索 API 或指南…" aria-labelledby="hia-public-search-title"><button class="hia-public-quiet-button" type="button" data-hia-search-close><span data-hia-public-i18n="searchClose">关闭</span></button></div><h2 class="hia-public-visually-hidden" id="hia-public-search-title" data-hia-public-i18n="searchTitle">搜索文档</h2><ul class="hia-public-search-results"><li data-hia-search-result><a href="./"><strong data-hia-public-i18n="overview">概览</strong><small data-hia-public-i18n="searchOverview">项目概览与快速开始</small></a></li><li data-hia-search-result><a href="${setRoute}"><strong>Cookies.set()</strong><small data-hia-public-i18n="searchSet">Cookies.set() · 写入 Cookie</small></a></li><li data-hia-search-result><a href="${getRoute}"><strong>Cookies.get()</strong><small data-hia-public-i18n="searchGet">Cookies.get() · 读取 Cookie</small></a></li></ul><p class="hia-public-search-empty" data-hia-search-empty data-hia-public-i18n="searchEmpty" hidden>没有匹配结果</p></dialog>`
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

  // <lang><zh-CN>先确定性改写导航 shard，使 public/all scope 在首屏树加载前已成立。</zh-CN><en>Rewrite the navigation shard deterministically first so public/all scope exists before the initial tree load.</en></lang>
  groupApiScopeNavigation(publicRoot)
  const setRoute = findTopicRoute(publicRoot, 'init-set-')
  const getRoute = findTopicRoute(publicRoot, 'init-get-')
  const structure = renderPublicStructure()
  html = html
    .replace(
      '<html ',
      '<html data-hia-api-scope="public" data-hia-show-metadata="hide" data-hia-show-contract="show" data-hia-show-coverage="hide" data-hia-show-provenance="show" data-hia-show-relations="hide" data-hia-code-theme="site" data-hia-code-font-size="default" data-hia-code-wrap="scroll" data-hia-code-lines="hide" data-hia-content-width="comfortable" '
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
      /<p class="hia-project-empty">[^<]*<\/p>/u,
      renderPublicLanding(setRoute, getRoute)
    )
    .replace(
      '</main></div><script src="assets/hia-default.js"',
      `</main>${structure.afterMain}</div>${renderSettingsDialog()}${renderSearchDialog(setRoute, getRoute)}<script src="assets/hia-default.js"`
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

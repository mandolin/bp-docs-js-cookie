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
  'BP-JS-COOKIE-DEFAULT-PORTAL-BASELINE-20260904-A'
/** @lang zh-CN 冻结的默认公开 profile 身份。 @lang en Frozen default public-profile identity. */
export const PUBLIC_PROFILE_ID = 'unified-portal.fetch.classic'

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
      version: '0.1.0',
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
      codeRuntime: 'native-pre-code-no-editor-runtime'
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
 * <lang><zh-CN>生成确认稿对应的全局 header。</zh-CN><en>Generates the global header from the confirmed design.</en></lang>
 *
 * @returns {string} <lang><zh-CN>无外部资源的 HTML fragment。</zh-CN><en>HTML fragment with no external resources.</en></lang>
 */
function renderPublicHeader() {
  return `<a class="hia-public-skip" href="#hia-public-main">跳到正文 / Skip to content</a><header class="hia-public-header" data-hia-public-product><a class="hia-public-brand" href="./" aria-label="js-cookie documentation home"><span class="hia-public-brand-mark" aria-hidden="true">JS</span><span class="hia-public-brand-copy"><strong>js-cookie</strong><small>HIA Documentation Portal</small></span></a><button class="hia-public-search-trigger" type="button" data-hia-public-search><span data-hia-public-i18n="search">搜索文档</span> <kbd>Ctrl K</kbd></button><div class="hia-public-header-actions"><span class="hia-public-version">v3.0.8</span><button class="hia-public-quiet-button" type="button" data-hia-public-locale aria-label="Switch documentation language">EN</button><button class="hia-public-settings-trigger" type="button" data-hia-settings-open aria-haspopup="dialog" aria-controls="hia-public-settings"><span aria-hidden="true">◈</span> <span data-hia-public-i18n="settings">主题与设置</span></button></div></header>`
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
  return `<article class="hia-public-landing"><header><p class="hia-public-eyebrow">浏览器 Cookie 工具库 / Browser Cookie utility</p><h1>轻量、明确地管理 Cookie。</h1><p class="hia-public-lede">以真实 js-cookie v3.0.8 源码和双语注释生成的多页 API 文档；默认按需读取同源源码，不执行源码正文。</p></header><section aria-labelledby="hia-public-start"><h2 id="hia-public-start">安装与开始 / Install and start</h2><pre><code>npm install js-cookie</code></pre><p><code>import Cookies from 'js-cookie'</code></p></section><section aria-labelledby="hia-public-api"><h2 id="hia-public-api">核心 API / Core API</h2><div class="hia-public-card-grid"><a class="hia-public-card" href="${setRoute}"><strong><code>Cookies.set()</code></strong><p>写入值，并显式控制 expires、path、domain、secure 与 sameSite。</p></a><a class="hia-public-card" href="${getRoute}"><strong><code>Cookies.get()</code></strong><p>读取指定名称，或取得当前文档可见的全部 Cookie。</p></a><a class="hia-public-card" href="pages/index.html"><strong>完整 API 索引</strong><p>浏览 18 个由当前 Portal profile 生成的文档节点。</p></a></div></section><section aria-labelledby="hia-public-provenance"><h2 id="hia-public-provenance">文档与源码溯源 / Provenance</h2><dl class="hia-public-meta"><dt>上游版本</dt><dd>js-cookie v3.0.8</dd><dt>公开 profile</dt><dd><code>unified-portal / fetch / classic</code></dd><dt>源码模式</dt><dd>same-origin · fetch-on-expand · no silent fallback</dd><dt>许可证</dt><dd>MIT</dd></dl></section></article>`
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
  return `<dialog class="hia-public-settings-dialog" id="hia-public-settings" data-hia-settings-dialog aria-labelledby="hia-public-settings-title"><div class="hia-public-settings-header"><div><small>js-cookie · Portal</small><h2 id="hia-public-settings-title" data-hia-public-i18n="settingsTitle">显示与代码设置</h2></div><button class="hia-public-quiet-button" type="button" data-hia-settings-close><span data-hia-public-i18n="close">关闭</span></button></div><div class="hia-public-settings-body"><fieldset><legend data-hia-public-i18n="siteTheme">站点主题</legend><div class="hia-public-theme-choices"><label><input type="radio" name="site-theme" value="system" data-hia-preference="siteTheme"> 跟随系统 / System</label><label><input type="radio" name="site-theme" value="light" data-hia-preference="siteTheme"> 浅色 / Light</label><label><input type="radio" name="site-theme" value="dark" data-hia-preference="siteTheme"> 深色 / Dark</label></div></fieldset><fieldset><legend data-hia-public-i18n="codeSettings">代码区域 / 编辑器设置</legend><div class="hia-public-settings-grid"><label class="hia-public-settings-field"><span>代码主题 / Code theme</span><select data-hia-preference="codeTheme"><option value="site">跟随站点 / Follow site</option><option value="paper-light">纸张浅色 / Paper Light</option><option value="midnight">午夜 / Midnight</option><option value="solarized-light">Solarized Light</option><option value="solarized-dark">Solarized Dark</option><option value="high-contrast">高对比度 / High Contrast</option></select></label><label class="hia-public-settings-field"><span>代码字号 / Code size</span><select data-hia-preference="codeFontSize"><option value="small">小 / Small</option><option value="default">默认 / Default</option><option value="large">大 / Large</option></select></label></div><div class="hia-public-toggle-row"><label>长行换行 / Line wrap <select data-hia-preference="codeWrap"><option value="scroll">横向滚动 / Scroll</option><option value="wrap">自动换行 / Wrap</option></select></label><label>行号 / Line numbers <select data-hia-preference="codeLines"><option value="hide">隐藏 / Hide</option><option value="show">显示 / Show</option></select></label></div><pre class="hia-public-settings-preview"><code>const cookie = Cookies.get('theme')\nCookies.set('theme', cookie ?? 'system')</code></pre></fieldset><fieldset><legend data-hia-public-i18n="reading">阅读设置</legend><label class="hia-public-settings-field"><span>正文宽度 / Content width</span><select data-hia-preference="contentWidth"><option value="comfortable">舒适 / Comfortable</option><option value="wide">宽幅 / Wide</option></select></label></fieldset></div><div class="hia-public-settings-footer"><div><p class="hia-public-settings-privacy" data-hia-public-i18n="privacy">仅保存显示偏好；不关联账号、不发送分析数据。</p><span data-hia-settings-status aria-live="polite"></span></div><button class="hia-public-secondary-button" type="button" data-hia-settings-reset><span data-hia-public-i18n="reset">恢复默认</span></button></div></dialog>`
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

  const setRoute = findTopicRoute(publicRoot, 'init-set-')
  const getRoute = findTopicRoute(publicRoot, 'init-get-')
  const structure = renderPublicStructure()
  html = html
    .replace('<html ', '<html data-hia-code-theme="site" data-hia-code-font-size="default" data-hia-code-wrap="scroll" data-hia-code-lines="hide" data-hia-content-width="comfortable" ')
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
      `</main>${structure.afterMain}</div>${renderSettingsDialog()}<script src="assets/hia-default.js"`
    )
    .replace(
      '</body>',
      '<script defer src="assets/hia-public-product.js"></script></body>'
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

/**
 * <lang><zh-CN>验证默认 Portal 公共产物的单 profile 契约与隔离复制边界。</zh-CN><en>Validates the single-profile contract and isolated copy boundary of the default Portal public artifact.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-public-artifact-test
 * @lang zh-CN 测试只使用临时目录，不生成真实文档、不读取 owner 仓库或源码正文。
 * @lang en Tests use only temporary directories and do not generate real documentation or read owner repositories or source bodies.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  PUBLICATION_BASELINE_ID,
  PUBLICATION_PROFILE_CONTRACT,
  PUBLIC_API_LABELS,
  createPublicArtifactManifest,
  groupApiScopeNavigation,
  materializePublicArtifact
} from './public-artifact.mjs'

/** @lang zh-CN 测试使用的完整公开 commit。 @lang en Full public commit used by tests. */
const BUILD_COMMIT = '1234567890abcdef1234567890abcdef12345678'
/** @lang zh-CN 当前测试模块目录用于读取将被原样发布的产品 runtime。 @lang en Current test-module directory is used to read the product runtime that is published verbatim. */
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

/**
 * <lang><zh-CN>构造由公开 JSDoc i18n 投影而来的 fixture 字段。</zh-CN><en>Builds a fixture field projected from public JSDoc i18n.</en></lang>
 *
 * @param {string} chinese <lang><zh-CN>中文字段正文。</zh-CN><en>Chinese field text.</en></lang>
 * @param {string} english <lang><zh-CN>英文字段正文。</zh-CN><en>English field text.</en></lang>
 * @returns {Object} <lang><zh-CN>project-index localizedText 字段。</zh-CN><en>project-index localizedText field.</en></lang>
 */
function localizedFixtureField(chinese, english) {
  return {
    localizedText: { 'zh-CN': chinese, en: english }
  }
}

/**
 * <lang><zh-CN>在隔离 fixture 中写入 owner 风格的可折叠 contract 页面。</zh-CN><en>Writes an owner-style collapsible contract page into an isolated fixture.</en></lang>
 *
 * @param {string} root <lang><zh-CN>临时公开 artifact 根。</zh-CN><en>Temporary public-artifact root.</en></lang>
 * @param {string} route <lang><zh-CN>相对公开根的 HTML route。</zh-CN><en>HTML route relative to the public root.</en></lang>
 * @returns {void}
 */
function writeContractFixturePage(root, route, entryIdentity) {
  // <lang><zh-CN>pagePath 由测试内固定 route 构造，只模拟公开静态 HTML。</zh-CN><en>PagePath is built from a fixed test route and simulates public static HTML only.</en></lang>
  const pagePath = path.join(root, ...route.split('/'))
  // <lang><zh-CN>documentLocale 模拟 owner 按静态页面 route 写入的 lang 属性。</zh-CN><en>DocumentLocale simulates the lang attribute emitted by the owner for each static page route.</en></lang>
  const documentLocale = route.startsWith('pages/en/') ? 'en' : 'zh-CN'
  fs.mkdirSync(path.dirname(pagePath), { recursive: true })
  fs.writeFileSync(
    pagePath,
    `<!doctype html><html lang="${documentLocale}"><head><title>API</title></head><body><article id="${entryIdentity}"><details class="hia-project-topic-section" data-hia-topic-section="contract"><summary>契约</summary><div class="hia-project-topic-section-body">旧契约</div></details></article></body></html>`,
    'utf8'
  )
}

/**
 * <lang><zh-CN>写入同一 semantic container 中的多个 API article，检验 target 投影不会更改 sibling。</zh-CN><en>Writes multiple API articles into one semantic container to verify that a target projection leaves siblings unchanged.</en></lang>
 *
 * @param {string} root <lang><zh-CN>临时公开 artifact 根。</zh-CN><en>Temporary public-artifact root.</en></lang>
 * @param {string} route <lang><zh-CN>共享 presentation 的 HTML route。</zh-CN><en>HTML route for the shared presentation.</en></lang>
 * @param {string[]} entryIdentities <lang><zh-CN>唯一 owner entry identities。</zh-CN><en>Unique owner entry identities.</en></lang>
 * @returns {void}
 */
function writeSharedPresentationFixture(root, route, entryIdentities) {
  // <lang><zh-CN>presentationPath 可以共享同一文件，页面仍以 article id 划分 owner topic。</zh-CN><en>PresentationPath may share one file while article IDs keep owner topics distinct.</en></lang>
  const presentationPath = path.join(root, ...route.split('/'))
  fs.mkdirSync(path.dirname(presentationPath), { recursive: true })
  const articles = entryIdentities
    .map(
      (entryIdentity) =>
        `<article id="${entryIdentity}"><details class="hia-project-topic-section" data-hia-topic-section="contract"><summary>契约</summary><div class="hia-project-topic-section-body">旧契约</div></details></article>`
    )
    .join('')
  fs.writeFileSync(
    presentationPath,
    `<!doctype html><html lang="zh-CN"><head><title>API</title></head><body>${articles}</body></html>`,
    'utf8'
  )
}

test('creates one default-Portal publication profile without a chooser', () => {
  // <lang><zh-CN>manifest 是 build、Pages checker 与 online checker 的共同公开事实源。</zh-CN><en>The manifest is the shared public fact source for the build, Pages checker, and online checker.</en></lang>
  const manifest = createPublicArtifactManifest({ buildCommit: BUILD_COMMIT })

  assert.equal(manifest.contract, PUBLICATION_PROFILE_CONTRACT)
  assert.equal(manifest.designBaseline.id, PUBLICATION_BASELINE_ID)
  assert.equal(manifest.buildCommit, BUILD_COMMIT)
  assert.equal(manifest.publicProfileCount, 1)
  assert.equal(manifest.localCiCoverageProfileCount, 27)
  assert.equal(manifest.defaultProfile.id, 'unified-portal.fetch.classic')
  assert.equal(manifest.defaultProfile.sourceMode, 'fetch')
  assert.equal(manifest.defaultProfile.pageMode, 'multi-page')
  assert.deepEqual(manifest.defaultProfile.uiLocale, {
    default: 'zh-CN',
    supported: ['zh-CN', 'en'],
    profileId: 'portal.default',
    surfaceId: 'portal.split-site',
    reportPath: 'documentation-ui-locale-completeness.json',
    noScriptLocaleIndexes: [
      'pages/zh-CN/index.html',
      'pages/en/index.html'
    ]
  })
  assert.equal(manifest.rootIsProfileChooser, false)
  assert.equal(manifest.reviewOnlyElementsIncluded, false)
  assert.equal(manifest.designBaseline.version, '0.2.0')
  assert.deepEqual(manifest.apiScope.options, ['public', 'all'])
  assert.equal(manifest.apiScope.default, 'public')
  assert.equal(manifest.apiScope.publicEntryCount, 7)
  assert.equal(manifest.apiScope.allEntryCount, 18)
  assert.equal(manifest.displaySettings.codeLineNumbersDefault, 'show')
  assert.deepEqual(manifest.displaySettings.contentVisibilityDefaults, {
    metadata: 'hide',
    contract: 'show',
    coverage: 'hide',
    provenance: 'show',
    relations: 'hide'
  })
  assert.equal(
    manifest.displaySettings.codeRuntime,
    'prismjs-1.30.0-after-verified-source'
  )
  assert.equal(manifest.displaySettings.highlighter.sourceExecution, false)
})

test('flattens generator-oriented navigation layers into the package reader root', (t) => {
  // <lang><zh-CN>该 fixture 模拟 owner 的完整 root → view → repository → package 链，确保公开树不是靠 CSS 隐藏冗余层级。</zh-CN><en>This fixture models the owner's complete root → view → repository → package chain, proving the public tree does not hide redundant levels with CSS.</en></lang>
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bp-js-cookie-reader-tree-')
  )
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }))
  const navigationRoot = path.join(temporaryRoot, 'navigation')
  fs.mkdirSync(navigationRoot, { recursive: true })
  /** @lang zh-CN entries 满足冻结的 7 + 11 分类边界，节点身份与本测试的层级断言无关。 @lang en Entries satisfy the frozen 7 + 11 classification boundary; their identities are independent from this test's hierarchy assertion. */
  const entries = [
    ...PUBLIC_API_LABELS,
    ...Array.from({ length: 11 }, (_, index) => `internal-${index + 1}`)
  ].map((label, index) => ({ id: `node-${index}`, label }))
  const packageFile =
    'semantic-repository-bp-docs-js-cookie-package-js-cookie-1234abcd.json'
  fs.writeFileSync(
    path.join(navigationRoot, packageFile),
    `${JSON.stringify({ children: entries })}\n`,
    'utf8'
  )
  fs.writeFileSync(
    path.join(navigationRoot, 'repository-1234abcd.json'),
    `${JSON.stringify({
      children: [
        {
          id: 'semantic:repository:bp-docs-js-cookie:package:js-cookie',
          kind: 'package',
          label: 'js-cookie 3.0.8',
          entryCount: 18,
          childrenPath: `navigation/${packageFile}`
        }
      ]
    })}\n`,
    'utf8'
  )
  fs.writeFileSync(
    path.join(navigationRoot, 'view-js-1234abcd.json'),
    `${JSON.stringify({
      children: [
        {
          id: 'semantic:repository:bp-docs-js-cookie',
          kind: 'repository',
          label: 'bp-docs-js-cookie',
          entryCount: 18,
          childrenPath: 'navigation/repository-1234abcd.json'
        }
      ]
    })}\n`,
    'utf8'
  )
  fs.writeFileSync(
    path.join(navigationRoot, 'root.json'),
    `${JSON.stringify({
      nodeId: 'root',
      children: [
        {
          id: 'view:js',
          kind: 'view',
          label: 'JS',
          entryCount: 18,
          childrenPath: 'navigation/view-js-1234abcd.json'
        }
      ]
    })}\n`,
    'utf8'
  )

  groupApiScopeNavigation(temporaryRoot)
  const rootShard = JSON.parse(
    fs.readFileSync(path.join(navigationRoot, 'root.json'), 'utf8')
  )

  assert.equal(rootShard.children.length, 1)
  assert.equal(rootShard.children[0].kind, 'package')
  assert.equal(rootShard.children[0].label, 'js-cookie 3.0.8')
  assert.equal(rootShard.children[0].childrenPath, `navigation/${packageFile}`)
})

test('groups the frozen public API set without changing owner entry identities', (t) => {
  // <lang><zh-CN>临时 shard 覆盖 7 个公开标签和 11 个确定性补集节点。</zh-CN><en>The temporary shard covers the seven public labels and eleven deterministic complement nodes.</en></lang>
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bp-js-cookie-api-scope-')
  )
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }))
  const navigationRoot = path.join(temporaryRoot, 'navigation')
  fs.mkdirSync(navigationRoot, { recursive: true })
  /** @lang zh-CN children 使用唯一 entryId 证明分组不改 owner identity。 @lang en Children use unique entryIds to prove grouping preserves owner identity. */
  const children = [
    ...PUBLIC_API_LABELS,
    ...Array.from({ length: 11 }, (_, index) => `internal-${index + 1}`)
  ].map((label, index) => ({
    id: `node-${index + 1}`,
    label,
    entryId: `entry-${index + 1}`,
    contentPath: `entries/${index + 1}.html`
  }))
  const shardPath = path.join(
    navigationRoot,
    'semantic-repository-bp-docs-js-cookie-package-js-cookie-1234abcd.json'
  )
  fs.writeFileSync(shardPath, `${JSON.stringify({ children })}\n`, 'utf8')

  const result = groupApiScopeNavigation(temporaryRoot)
  const grouped = JSON.parse(fs.readFileSync(shardPath, 'utf8'))

  assert.deepEqual(result, { publicEntryCount: 7, allEntryCount: 18 })
  assert.deepEqual(
    grouped.children.map((group) => [group.id, group.entryCount]),
    [
      ['bp:public-api', 7],
      ['bp:internal-api', 11]
    ]
  )
  assert.deepEqual(
    grouped.children[0].children.map((entry) => entry.entryId),
    children.slice(0, 7).map((entry) => entry.entryId)
  )
})

test('copies only the default Portal tree into an isolated public root', (t) => {
  // <lang><zh-CN>临时根模拟 showcase 中的默认 surface 与同级未发布 profile。</zh-CN><en>The temporary root models the default showcase surface and a sibling unpublished profile.</en></lang>
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bp-js-cookie-public-artifact-')
  )
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }))
  const defaultRoot = path.join(temporaryRoot, 'showcase', 'default')
  const unusedRoot = path.join(temporaryRoot, 'showcase', 'unused')
  const publicRoot = path.join(temporaryRoot, 'public')
  fs.mkdirSync(path.join(defaultRoot, 'assets'), { recursive: true })
  fs.mkdirSync(path.join(defaultRoot, 'pages'), { recursive: true })
  fs.mkdirSync(path.join(defaultRoot, 'entries'), { recursive: true })
  fs.mkdirSync(unusedRoot, { recursive: true })
  fs.writeFileSync(
    path.join(defaultRoot, 'index.html'),
    '<!doctype html><html data-hia-scheme="system"><head><link rel="stylesheet" href="assets/hia-default.css"></head><body><div class="hia-shell hia-project-split-site"><aside class="hia-sidebar"><input data-hia-project-search></aside><main class="hia-main" data-hia-project-content><p class="hia-project-empty"><span data-hia-ui-message="portal.navigation.select">Select a documentation entry.</span></p><noscript><p>No script</p></noscript></main></div><script src="assets/hia-default.js"></script></body></html>'
  )
  fs.writeFileSync(path.join(defaultRoot, 'assets', 'site.css'), ':root{}')
  /** @lang zh-CN featuredEntries 模拟公开 project-index 中可校验的 set/get owner identity、route 与双语 JSDoc 字段。 @lang en FeaturedEntries simulate the set/get owner identities, routes, and bilingual JSDoc fields validated from the public project index. */
  const featuredEntries = [
    {
      id: 'jsdoc-integration:jsdoc-function-module-js-cookie-api-init-set',
      symbolId: 'jsdoc:function:module:js-cookie/api~init~set',
      presentationPath: 'semantic-containers/package.html',
      contentPath: 'entries/set.html',
      noScriptPagePath: 'pages/set.html',
      noScriptLocalePages: [
        { uiLocale: 'zh-CN', path: 'pages/zh-CN/set.html' },
        { uiLocale: 'en', path: 'pages/en/set.html' }
      ],
      i18n: {
        fields: {
          'params.name.description': localizedFixtureField(
            'Cookie 名称。',
            'The Cookie name.'
          ),
          'params.value.description': localizedFixtureField(
            '交给 converter 编码的值。',
            'The value passed to the converter for encoding.'
          ),
          'params.attributes.description': localizedFixtureField(
            '本次写入覆盖属性。',
            'Per-write override attributes.'
          ),
          'returns.0.description': localizedFixtureField(
            '浏览器接受的赋值字符串；无 DOM 时为 undefined。',
            'The accepted assignment string, or undefined without a DOM.'
          )
        }
      }
    },
    {
      id: 'jsdoc-integration:jsdoc-function-module-js-cookie-api-init-get',
      symbolId: 'jsdoc:function:module:js-cookie/api~init~get',
      presentationPath: 'semantic-containers/package.html',
      contentPath: 'entries/get.html',
      noScriptPagePath: 'pages/get.html',
      noScriptLocalePages: [
        { uiLocale: 'zh-CN', path: 'pages/zh-CN/get.html' },
        { uiLocale: 'en', path: 'pages/en/get.html' }
      ],
      i18n: {
        fields: {
          'params.name.description': localizedFixtureField(
            '可选 Cookie 名称。',
            'Optional Cookie name.'
          ),
          'returns.0.description': localizedFixtureField(
            '名称对应值、全部值映射或 undefined。',
            'Named value, complete value map, or undefined.'
          )
        }
      }
    }
  ]
  for (const entry of featuredEntries) {
    for (const route of [
      entry.contentPath,
      entry.noScriptPagePath,
      ...entry.noScriptLocalePages.map((page) => page.path)
    ]) {
      writeContractFixturePage(defaultRoot, route, entry.id)
    }
  }
  writeSharedPresentationFixture(
    defaultRoot,
    'semantic-containers/package.html',
    featuredEntries.map((entry) => entry.id)
  )
  fs.writeFileSync(
    path.join(defaultRoot, 'project-index.json'),
    `${JSON.stringify({ entries: featuredEntries })}\n`,
    'utf8'
  )
  fs.writeFileSync(path.join(unusedRoot, 'chooser.html'), 'not public')

  const result = materializePublicArtifact({
    buildCommit: BUILD_COMMIT,
    defaultRoot,
    publicRoot
  })

  const publicHtml = fs.readFileSync(
    path.join(publicRoot, 'index.html'),
    'utf8'
  )
  assert.match(publicHtml, /data-hia-public-product/u)
  assert.match(publicHtml, /class="no-js" data-hia-api-scope="public"/u)
  assert.match(publicHtml, /data-hia-public-i18n-aria="home"/u)
  assert.match(publicHtml, /data-hia-public-i18n-aria="openSettings"/u)
  assert.match(publicHtml, /data-hia-settings-dialog/u)
  assert.match(publicHtml, /data-hia-search-dialog/u)
  assert.match(publicHtml, /aria-controls="hia-public-search"/u)
  assert.match(publicHtml, /代码区域 \/ 编辑器设置/u)
  assert.match(publicHtml, /只显示接口 API/u)
  assert.match(publicHtml, /data-hia-show-metadata="hide"/u)
  assert.match(publicHtml, /data-hia-code-lines="show"/u)
  assert.match(publicHtml, /assets\/prism\.js/u)
  assert.match(publicHtml, /data-hia-public-outline/u)
  assert.match(publicHtml, /data-hia-public-footer/u)
  assert.match(publicHtml, /静态文档导航/u)
  assert.match(publicHtml, /轻量、明确地管理 Cookie/u)
  assert.match(publicHtml, /install js-cookie|npm install js-cookie/iu)
  assert.match(publicHtml, /data-hia-public-entry="jsdoc-integration:jsdoc-function-module-js-cookie-api-init-set"/u)
  assert.match(publicHtml, /pages\/set\.html/u)
  assert.match(publicHtml, /data-hia-public-entry="jsdoc-integration:jsdoc-function-module-js-cookie-api-init-get"/u)
  assert.equal(publicHtml.includes('candidate-status-strip'), false)

  // <lang><zh-CN>setPage/getPage 验证交互 fragment 与 no-script 页面共用完整 contract。</zh-CN><en>SetPage and getPage verify that interactive fragments and no-script pages share the complete contract.</en></lang>
  const setPage = fs.readFileSync(path.join(publicRoot, 'entries', 'set.html'), 'utf8')
  const getPage = fs.readFileSync(path.join(publicRoot, 'pages', 'get.html'), 'utf8')
  const presentationPage = fs.readFileSync(
    path.join(publicRoot, 'semantic-containers', 'package.html'),
    'utf8'
  )
  const setPresentationArticle = presentationPage.match(
    /<article\b[^>]*\bid="jsdoc-integration:jsdoc-function-module-js-cookie-api-init-set"[^>]*>[\s\S]*?<\/article>/u
  )?.[0]
  const getPresentationArticle = presentationPage.match(
    /<article\b[^>]*\bid="jsdoc-integration:jsdoc-function-module-js-cookie-api-init-get"[^>]*>[\s\S]*?<\/article>/u
  )?.[0]
  assert.match(setPresentationArticle, /Cookies\.set\(name, value, attributes\?\)/u)
  assert.doesNotMatch(setPresentationArticle, /Cookies\.get\(name\?\)/u)
  assert.match(getPresentationArticle, /Cookies\.get\(name\?\)/u)
  assert.doesNotMatch(getPresentationArticle, /Cookies\.set\(name, value/u)
  assert.match(setPage, /data-hia-topic-section="contract"[^>]* open>/u)
  assert.match(setPage, /Cookies\.set\(name, value, attributes\?\)/u)
  assert.match(setPage, /CookieAttributes/u)
  assert.match(setPage, /名称或值含有无法 URI 编码的输入时会抛出 URIError/u)
  assert.match(setPage, /id="hia-api-set-examples"/u)
  assert.match(getPage, /Cookies\.get\(name\?\) → string \| Object \| undefined/u)
  assert.doesNotMatch(getPage, /Record&lt;string, string&gt;/u)
  assert.match(getPage, /单个畸形 Cookie 的解码错误不会阻断其它可见 Cookie/u)
  assert.match(getPage, /自定义 converter 也可能改变无参数映射中各值的类型/u)
  assert.match(getPage, /hia-public-api-contract-host/u)
  assert.match(getPage, /<html class="no-js" lang="zh-CN">/u)
  assert.match(getPage, /\.\.\/assets\/hia-public-product\.css/u)
  assert.doesNotMatch(getPage, /hia-public-product\.js/u)
  const englishGetPage = fs.readFileSync(
    path.join(publicRoot, 'pages', 'en', 'get.html'),
    'utf8'
  )
  assert.match(englishGetPage, /\.\.\/\.\.\/assets\/hia-public-product\.css/u)
  assert.match(englishGetPage, /data-hia-locale="en" lang="en">Name/u)
  assert.match(englishGetPage, /data-hia-locale="zh-CN" lang="zh-CN" hidden/u)
  assert.equal(fs.existsSync(path.join(publicRoot, 'assets', 'site.css')), true)
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'assets', 'hia-public-product.css')),
    true
  )
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'assets', 'hia-public-product.js')),
    true
  )
  assert.equal(fs.existsSync(path.join(publicRoot, 'assets', 'prism.js')), true)
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'assets', 'prism-line-numbers.js')),
    true
  )
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'assets', 'prism-LICENSE.txt')),
    true
  )
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'unused', 'chooser.html')),
    false
  )
  assert.equal(fs.existsSync(path.join(publicRoot, 'profiles')), false)
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'showcase-matrix.json')),
    false
  )
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(
        path.join(publicRoot, 'documentation-publication-profile.json'),
        'utf8'
      )
    ),
    result.manifest
  )
  assert.equal(result.manifest.publicProfileCount, 1)
  assert.equal(result.copiedFileCount, 12)
})

test('rejects a symbolic link in the default Portal source tree', (t) => {
  // <lang><zh-CN>发布复制不得把本机或 owner tree 通过链接带入 Pages。</zh-CN><en>Publication copying must not carry host or owner trees into Pages through links.</en></lang>
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bp-js-cookie-public-link-')
  )
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }))
  const defaultRoot = path.join(temporaryRoot, 'showcase', 'default')
  const publicRoot = path.join(temporaryRoot, 'public')
  fs.mkdirSync(defaultRoot, { recursive: true })
  fs.writeFileSync(path.join(defaultRoot, 'index.html'), '<main>Portal</main>')
  fs.symlinkSync(
    path.join(defaultRoot, 'index.html'),
    path.join(defaultRoot, 'linked.html'),
    'file'
  )

  assert.throws(
    () =>
      materializePublicArtifact({
        buildCommit: BUILD_COMMIT,
        defaultRoot,
        publicRoot
      }),
    /symbolic link/u
  )
})

test('keeps deep-link recovery bounded while tolerating remote shard latency', () => {
  // <lang><zh-CN>静态边界防止恢复窗口回退为仅适合本地延迟的短次数循环，也防止 BP 产品层接管 owner 网络职责。</zh-CN><en>This static boundary prevents the recovery window from regressing to a short local-latency loop and prevents the BP product layer from taking over owner network duties.</en></lang>
  const runtime = fs.readFileSync(
    path.join(MODULE_DIRECTORY, 'public-product.js'),
    'utf8'
  )
  assert.match(runtime, /const deadline = performance\.now\(\) \+ 10000/u)
  assert.match(runtime, /while \(performance\.now\(\) < deadline\)/u)
  assert.match(runtime, /activeEntryIdentity\(\) !== identity/u)
  assert.match(runtime, /details\.dataset\.hiaSourceState !== 'ready'/u)
  assert.match(runtime, /globalThis\.Prism\.highlightElement\(code\)/u)
  assert.match(
    runtime,
    /const storageKey = 'hia\.bp-docs-js-cookie\.display\.v3'/u
  )
  assert.match(runtime, /pre\.dataset\.start = String\(startLine\)/u)
  assert.match(runtime, /ensureOverviewTreeItem\(\)/u)
  assert.match(runtime, /\[data-hia-ui-locale-control\]/u)
  assert.equal(runtime.includes('[data-hia-locale-control]'), false)
  assert.match(runtime, /BP product UI locale bundles are incomplete/u)
  assert.match(runtime, /bindPublicEntryLinks\(\)/u)
  assert.match(runtime, /window\.history\.pushState/u)
  assert.match(runtime, /window\.location\.reload\(\)/u)
  assert.match(runtime, /root\.classList\.remove\('no-js'\)/u)
  assert.match(runtime, /data-hia-topic-section="contract"\] h3\[id\]/u)
  assert.ok(
    runtime.indexOf("nodeId.includes(':package:')") <
      runtime.indexOf("nodeId.includes(':repository:')")
  )
  assert.equal(/\bfetch\s*\(/u.test(runtime), false)
})

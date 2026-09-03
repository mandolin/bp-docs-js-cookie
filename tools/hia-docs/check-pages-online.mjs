/**
 * <lang><zh-CN>匿名验证已部署的 bp-docs-js-cookie 单一默认 Portal 产品。</zh-CN><en>Anonymously verifies the deployed single default Portal product for bp-docs-js-cookie.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-pages-online-check
 * @lang zh-CN 只允许 canonical project Pages origin 下的有界 GET，不发送 cookie、credential、referrer 或跨源源码请求。
 * @lang en Only bounded GET requests under the canonical project Pages origin are allowed; no cookies, credentials, referrer, or cross-origin source requests are sent.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { PAGES_SITE, resolveTopology } from './config.mjs'

/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)
/** @lang zh-CN 可选本地 online evidence 位置。 @lang en Optional local online-evidence location. */
const topology = resolveTopology(repositoryRoot)
/** @lang zh-CN 单个公开响应最大 6 MiB。 @lang en Maximum public response size is 6 MiB. */
const MAX_RESPONSE_BYTES = 6 * 1024 * 1024
/** @lang zh-CN Pages 传播期的最多尝试次数。 @lang en Maximum attempts during Pages propagation. */
const MAX_ATTEMPTS = 12
/** @lang zh-CN 两次传播检查之间的毫秒数。 @lang en Milliseconds between propagation checks. */
const RETRY_DELAY_MS = 5000

/**
 * <lang><zh-CN>断言线上验收条件。</zh-CN><en>Asserts an online-acceptance condition.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为真的条件。</zh-CN><en>Condition that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>公开安全诊断。</zh-CN><en>Public-safe diagnostic.</en></lang>
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * <lang><zh-CN>等待有界的 Pages 传播间隔。</zh-CN><en>Waits for a bounded Pages propagation interval.</en></lang>
 *
 * @param {number} milliseconds <lang><zh-CN>等待毫秒数。</zh-CN><en>Milliseconds to wait.</en></lang>
 * @returns {Promise<void>}
 */
function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

/**
 * <lang><zh-CN>验证相对 path 是 canonical project origin 下的安全 Pages route。</zh-CN><en>Validates that a relative path is a safe Pages route under the canonical project origin.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>canonical root 相对路径。</zh-CN><en>Path relative to the canonical root.</en></lang>
 * @returns {URL} <lang><zh-CN>已验证 URL。</zh-CN><en>Validated URL.</en></lang>
 */
function resolvePublicUrl(relativePath) {
  assert(
    typeof relativePath === 'string' &&
      !relativePath.startsWith('/') &&
      !relativePath.split('/').includes('..'),
    'Online check refused an unsafe relative path.'
  )
  const url = new URL(relativePath, PAGES_SITE.canonicalUrl)
  const canonical = new URL(PAGES_SITE.canonicalUrl)
  assert(
    url.origin === canonical.origin,
    'Online check refused a cross-origin URL.'
  )
  assert(!url.username && !url.password, 'Online check refused URL userinfo.')
  assert(
    url.pathname.startsWith(PAGES_SITE.projectBasePath),
    'Online check refused a URL outside the project base path.'
  )
  return url
}

/**
 * <lang><zh-CN>读取同源、无凭据且有大小限制的公开资源。</zh-CN><en>Reads a same-origin, credential-free public resource with a size limit.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>canonical root 下的相对路径。</zh-CN><en>Relative path under the canonical root.</en></lang>
 * @returns {Promise<{path:string,url:string,contentType:string,bytes:Uint8Array,text:string}>} <lang><zh-CN>有界响应。</zh-CN><en>Bounded response.</en></lang>
 */
async function readPublicResource(relativePath) {
  const url = resolvePublicUrl(relativePath)
  // <lang><zh-CN>单请求 15 秒 abort controller。</zh-CN><en>Fifteen-second abort controller for one request.</en></lang>
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    })
    assert(
      response.status === 200,
      `${relativePath || '/'} returned HTTP ${response.status}.`
    )
    const bytes = new Uint8Array(await response.arrayBuffer())
    assert(
      bytes.byteLength <= MAX_RESPONSE_BYTES,
      `${relativePath || '/'} exceeded the response limit.`
    )
    return {
      path: relativePath || '/',
      url: url.href,
      contentType: response.headers.get('content-type') || '',
      bytes,
      text: new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * <lang><zh-CN>解析公开 JSON 并保留响应元数据。</zh-CN><en>Parses public JSON while retaining response metadata.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>公开 JSON route。</zh-CN><en>Public JSON route.</en></lang>
 * @returns {Promise<{resource:Object,value:Object}>} <lang><zh-CN>响应与解析对象。</zh-CN><en>Response and parsed object.</en></lang>
 */
async function readPublicJson(relativePath) {
  const resource = await readPublicResource(relativePath)
  assert(
    /application\/json/iu.test(resource.contentType),
    `${relativePath} is not JSON.`
  )
  return { resource, value: JSON.parse(resource.text) }
}

/**
 * <lang><zh-CN>证明旧 chooser/matrix route 不再公开；不读取或保存 404 body。</zh-CN><en>Proves that an old chooser/matrix route is no longer public without reading or retaining the 404 body.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>预期不存在的公开相对路径。</zh-CN><en>Public relative path expected to be absent.</en></lang>
 * @returns {Promise<{path:string,status:number}>} <lang><zh-CN>无正文缺失证据。</zh-CN><en>Body-free absence evidence.</en></lang>
 */
async function assertPubliclyAbsent(relativePath) {
  const url = resolvePublicUrl(relativePath)
  const response = await fetch(url, {
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer'
  })
  assert(response.status === 404, `${relativePath} is unexpectedly public.`)
  response.body?.cancel()
  return { path: relativePath, status: response.status }
}

/**
 * <lang><zh-CN>执行一次完整的默认 Portal 产品与旧 route 缺失检查。</zh-CN><en>Runs one complete check of the default Portal product and absence of legacy routes.</en></lang>
 *
 * @param {string} expectedCommit <lang><zh-CN>当前 BP exact commit。</zh-CN><en>Current exact BP commit.</en></lang>
 * @returns {Promise<{responses:Array<Object>,absentPaths:Array<Object>,verifiedProfile:string,verifiedSourceAsset:Object}>} <lang><zh-CN>无正文线上摘要。</zh-CN><en>Body-free online summary.</en></lang>
 */
async function checkOnce(expectedCommit) {
  const responses = []
  /**
   * <lang><zh-CN>读取资源并把 body-free 响应 facts 记入当前尝试。</zh-CN><en>Reads a resource and records body-free response facts for the current attempt.</en></lang>
   *
   * @param {string} relativePath <lang><zh-CN>公开相对 path。</zh-CN><en>Public relative path.</en></lang>
   * @returns {Promise<Object>} <lang><zh-CN>完整响应，仅在内存断言。</zh-CN><en>Full response used only for in-memory assertions.</en></lang>
   */
  const read = async (relativePath) => {
    const resource = await readPublicResource(relativePath)
    responses.push({
      path: resource.path,
      bytes: resource.bytes.byteLength,
      contentType: resource.contentType
    })
    return resource
  }
  /**
   * <lang><zh-CN>读取 JSON 并记录 body-free 响应 facts。</zh-CN><en>Reads JSON and records body-free response facts.</en></lang>
   *
   * @param {string} relativePath <lang><zh-CN>公开 JSON path。</zh-CN><en>Public JSON path.</en></lang>
   * @returns {Promise<{resource:Object,value:Object}>} <lang><zh-CN>内存 JSON response。</zh-CN><en>In-memory JSON response.</en></lang>
   */
  const readJson = async (relativePath) => {
    const result = await readPublicJson(relativePath)
    responses.push({
      path: result.resource.path,
      bytes: result.resource.bytes.byteLength,
      contentType: result.resource.contentType
    })
    return result
  }

  const root = await read('')
  const portalCss = await read('assets/hia-default.css')
  const portalJs = await read('assets/hia-default.js')
  const productCss = await read('assets/hia-public-product.css')
  const productJs = await read('assets/hia-public-product.js')
  const prismJs = await read('assets/prism.js')
  const prismLineNumbersJs = await read('assets/prism-line-numbers.js')
  const prismLicense = await read('assets/prism-LICENSE.txt')
  const publicationResult = await readJson(
    'documentation-publication-profile.json'
  )
  const publication = publicationResult.value
  /** @lang zh-CN readerNavigationResult 证明已部署首屏树直接从 package 开始，而非依赖 CSS 隐藏 view/repository。</zh-CN><en>readerNavigationResult proves the deployed initial tree begins at the package rather than hiding view/repository layers with CSS.</en></lang> */
  const readerNavigationResult = await readJson('navigation/root.json')
  const readerNavigation = readerNavigationResult.value
  const presentationResult = await readJson(
    'documentation-presentation-profile.json'
  )
  const presentation = presentationResult.value
  assert(
    root.text.includes('hia-project-split-site'),
    'Public root is not the default Portal product.'
  )
  assert(
    root.text.includes('data-hia-skin-control') &&
      root.text.includes('data-hia-scheme-control'),
    'Default Portal theme controls are missing.'
  )
  assert(
    !root.text.includes('data-showcase-profile=') &&
      !root.text.includes('bp-docs-js-cookie 文档工程展示'),
    'Legacy profile chooser remains at the public root.'
  )
  assert(root.text.includes('<noscript>'), 'Hub lacks no-script reachability.')
  assert(
    root.text.includes('data-hia-api-scope="public"') &&
      root.text.includes('data-hia-code-lines="show"') &&
      root.text.includes('只显示接口 API') &&
      root.text.includes('assets/prism.js'),
    'Baseline-B API scope, settings, or local highlighter is missing.'
  )
  assert(
    portalCss.text.includes('hia-project-split-site') &&
      portalJs.text.includes('data-hia-locale-control') &&
      portalJs.text.includes('applyThemeSelection'),
    'Portal owner assets lack split-site, locale, or theme behavior.'
  )
  assert(
    /\[data-hia-api-scope=(?:"public"|'public')\]/u.test(productCss.text) &&
      productCss.text.includes('.token.keyword') &&
      productCss.text.includes('pre.line-numbers > code') &&
      productJs.text.includes("details.dataset.hiaSourceState !== 'ready'") &&
      productJs.text.includes("'hia.bp-docs-js-cookie.display.v3'") &&
      productJs.text.includes('pre.dataset.start = String(startLine)') &&
      productJs.text.includes('ensureOverviewTreeItem()') &&
      productJs.text.includes('globalThis.Prism.highlightElement(code)') &&
      prismJs.text.includes('Prism') &&
      prismLineNumbersJs.text.includes('line-numbers') &&
      prismLicense.text.toUpperCase().includes('MIT LICENSE'),
    'Deployed product assets lack API-scope, verified highlighting, or license evidence.'
  )
  // <lang><zh-CN>Portal owner 把导航、内容与源码读取器内联在产品 HTML；外部 hia-default.js 只承载主题和 locale 偏好。</zh-CN><en>The Portal owner inlines navigation, content, and source readers in the product HTML; external hia-default.js carries only theme and locale preferences.</en></lang>
  assert(
    root.text.includes("credentials: 'omit'") &&
      root.text.includes("mode: 'same-origin'") &&
      root.text.includes("redirect: 'error'"),
    'Portal product lacks credential-free, same-origin, redirect-denying source reads.'
  )
  assert(
    publication.contract === 'bp-documentation-publication-profile@0.1.0-draft',
    'Publication-profile contract drifted.'
  )
  assert(
    publication.buildCommit === expectedCommit,
    'Deployed publication commit is stale.'
  )
  assert(
    publication.publicProfileCount === 1 &&
      publication.localCiCoverageProfileCount === 27 &&
      publication.rootIsProfileChooser === false,
    'Deployed profile separation drifted.'
  )
  assert(
    publication.designBaseline?.id ===
      'BP-JS-COOKIE-DEFAULT-PORTAL-BASELINE-20260904-B' &&
      publication.designBaseline?.version === '0.2.0' &&
      publication.apiScope?.default === 'public' &&
      publication.apiScope?.publicEntryCount === 7 &&
      publication.apiScope?.allEntryCount === 18 &&
      publication.displaySettings?.codeLineNumbersDefault === 'show' &&
      publication.displaySettings?.codeRuntime ===
        'prismjs-1.30.0-after-verified-source',
    'Deployed baseline-B scope or highlighter contract drifted.'
  )
  assert(
    readerNavigation.children?.length === 1 &&
      readerNavigation.children[0]?.kind === 'package' &&
      readerNavigation.children[0]?.label === 'js-cookie 3.0.8' &&
      /^navigation\/semantic-repository-bp-docs-js-cookie-package-js-cookie-[a-f0-9]+\.json$/u.test(
        readerNavigation.children[0]?.childrenPath
      ),
    'Deployed reader navigation root was not flattened to the package level.'
  )
  assert(
    publication.defaultProfile?.id === 'unified-portal.fetch.classic',
    'Deployed default profile drifted.'
  )
  assert(
    presentation.pagePartition?.mode === 'multi-page',
    'Default Portal is not multi-page.'
  )
  assert(
    presentation.source?.mode === 'fetch',
    'Default Portal is not fetch mode.'
  )
  assert(
    presentation.theme?.skinId === 'portal.classic',
    'Default Portal skin drifted.'
  )
  const sourceAsset = presentation.source?.assets?.[0]
  assert(
    /^sources\/[a-f0-9]{64}\.txt$/u.test(sourceAsset?.relativeUrl),
    'Default Portal lacks a safe fetch asset.'
  )
  const sourceResource = await read(sourceAsset.relativeUrl)
  assert(
    sourceResource.bytes.byteLength === sourceAsset.byteLength,
    'Online source asset byte length drifted.'
  )
  const sourceSha384 = crypto
    .createHash('sha384')
    .update(sourceResource.bytes)
    .digest('base64')
  assert(
    sourceAsset.digest?.algorithm === 'sha384' &&
      sourceAsset.digest?.value === sourceSha384,
    'Online source asset digest drifted.'
  )

  // <lang><zh-CN>no-script 页面索引与一个深层 topic 证明多页 route 在 project base path 下可达。</zh-CN><en>The no-script page index and one deep topic prove multi-page routes are reachable under the project base path.</en></lang>
  const pageIndex = await read('pages/index.html')
  const pageMatch = pageIndex.text.match(/href="\.\/([^"/]+\.html)"/u)
  assert(
    /^[a-z0-9][a-z0-9.-]*\.html$/u.test(pageMatch?.[1]),
    'No-script page index lacks a safe topic route.'
  )
  const topic = await read(`pages/${pageMatch[1]}`)
  assert(
    topic.text.includes('hia-project-topic'),
    'Deep topic route lacks Portal content.'
  )

  // <lang><zh-CN>旧矩阵 manifest 与一个旧 profile route 都必须在线返回 404。</zh-CN><en>Both the old matrix manifest and a representative old profile route must return 404 online.</en></lang>
  const absentPaths = await Promise.all([
    assertPubliclyAbsent('showcase-matrix.json'),
    assertPubliclyAbsent('profiles/jphs-jth-native/embed/classic/')
  ])

  return {
    responses,
    absentPaths,
    verifiedProfile: publication.defaultProfile.id,
    verifiedSourceAsset: {
      path: sourceAsset.relativeUrl,
      bytes: sourceResource.bytes.byteLength,
      digestAlgorithm: sourceAsset.digest.algorithm,
      digestMatched: true
    }
  }
}

/**
 * <lang><zh-CN>在有界传播窗口内验证 canonical Pages。</zh-CN><en>Verifies canonical Pages within a bounded propagation window.</en></lang>
 *
 * @returns {Promise<void>}
 */
async function main() {
  const expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  }).trim()
  assert(
    /^[0-9a-f]{40}$/u.test(expectedCommit),
    'Expected commit must be a full Git SHA.'
  )

  /** @type {unknown} */
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await checkOnce(expectedCommit)
      const evidence = {
        contract: 'bp-js-cookie-documentation-public-online-check',
        contractVersion: '0.1.0-draft',
        status: 'public-pages-verified',
        canonicalUrl: PAGES_SITE.canonicalUrl,
        attempt,
        expectedCommit,
        resourceCount: result.responses.length,
        responses: result.responses,
        verifiedProfile: result.verifiedProfile,
        absentPaths: result.absentPaths,
        verifiedSourceAsset: result.verifiedSourceAsset,
        privacy: {
          credentialSent: false,
          crossOriginRequestCount: 0,
          responseBodyCopiedToEvidence: false
        }
      }
      fs.mkdirSync(topology.evidenceRoot, { recursive: true })
      fs.writeFileSync(
        path.join(topology.evidenceRoot, 'online.json'),
        `${JSON.stringify(evidence, null, 2)}\n`,
        'utf8'
      )
      process.stdout.write(`${JSON.stringify(evidence)}\n`)
      return
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS)
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Public Pages verification failed.')
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
})

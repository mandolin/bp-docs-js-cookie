/**
 * <lang><zh-CN>匿名验证已部署的 bp-docs-js-cookie 展示 hub 与代表性 owner surfaces。</zh-CN><en>Anonymously verifies the deployed bp-docs-js-cookie showcase hub and representative owner surfaces.</en></lang>
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
 * <lang><zh-CN>执行一次完整公开站矩阵抽样检查。</zh-CN><en>Runs one complete representative check of the public matrix.</en></lang>
 *
 * @param {string} expectedCommit <lang><zh-CN>当前 BP exact commit。</zh-CN><en>Current exact BP commit.</en></lang>
 * @returns {Promise<{responses:Array<Object>,verifiedProfiles:string[],verifiedSourceAsset:Object}>} <lang><zh-CN>无正文线上摘要。</zh-CN><en>Body-free online summary.</en></lang>
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
  const hubCss = await read('assets/showcase.css')
  const hubJs = await read('assets/showcase.js')
  const matrixResult = await readJson('showcase-matrix.json')
  const matrix = matrixResult.value
  assert(
    root.text.includes('bp-docs-js-cookie 文档工程展示'),
    'Hub title is missing.'
  )
  assert(
    (root.text.match(/data-showcase-profile=/gu) || []).length === 27,
    'Hub lacks 27 static profile cards.'
  )
  assert(
    (root.text.match(/data-showcase-surface=/gu) || []).length === 36,
    'Hub lacks 36 static surface links.'
  )
  assert(root.text.includes('<noscript>'), 'Hub lacks no-script reachability.')
  assert(
    root.text.includes('href="profiles/unified-portal/fetch/classic/"'),
    'Hub default route drifted.'
  )
  assert(
    hubCss.text.includes('@media(max-width:680px)'),
    'Hub lacks narrow layout.'
  )
  assert(
    hubJs.text.includes("querySelectorAll('[data-filter]')"),
    'Hub filter runtime is missing.'
  )
  assert(
    matrix.contract === 'bp-documentation-showcase-matrix',
    'Matrix contract drifted.'
  )
  assert(
    matrix.buildCommit === expectedCommit,
    'Deployed matrix commit is stale.'
  )
  assert(
    matrix.profileCount === 27 && matrix.surfaceCount === 36,
    'Matrix counts drifted.'
  )

  // <lang><zh-CN>默认 Portal/fetch/classic 证明 split-site、三皮肤 selector 与内容寻址 fetch asset。</zh-CN><en>The default Portal/fetch/classic profile proves split-site, the three-skin selector, and a content-addressed fetch asset.</en></lang>
  const defaultBase = 'profiles/unified-portal/fetch/classic/'
  const defaultRoot = await read(defaultBase)
  const defaultPresentationResult = await readJson(
    `${defaultBase}documentation-presentation-profile.json`
  )
  const defaultPresentation = defaultPresentationResult.value
  assert(
    defaultRoot.text.includes('hia-project-split-site'),
    'Default Portal is not split-site.'
  )
  assert(
    defaultRoot.text.includes('data-hia-skin-control'),
    'Default Portal lacks skin switching.'
  )
  assert(
    defaultPresentation.pagePartition?.mode === 'multi-page',
    'Default Portal is not multi-page.'
  )
  assert(
    defaultPresentation.source?.mode === 'fetch',
    'Default Portal is not fetch mode.'
  )
  assert(
    defaultPresentation.theme?.skinId === 'portal.classic',
    'Default Portal skin drifted.'
  )
  const sourceAsset = defaultPresentation.source?.assets?.[0]
  assert(
    /^sources\/[a-f0-9]{64}\.txt$/u.test(sourceAsset?.relativeUrl),
    'Default Portal lacks a safe fetch asset.'
  )
  const sourceResource = await read(`${defaultBase}${sourceAsset.relativeUrl}`)
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

  // <lang><zh-CN>直接 JPHS/JTH embed 抽样证明正文只出现在 topic page，而非 hub/index。</zh-CN><en>The direct JPHS/JTH embed sample proves source text appears only on a topic page, not the hub/index.</en></lang>
  const directEmbedBase = 'profiles/jphs-jth-native/embed/classic/'
  const directRoot = await read(directEmbedBase)
  const directPageMapResult = await readJson(
    `${directEmbedBase}hia-page-map.json`
  )
  const directPage = directPageMapResult.value.pages?.[0]?.file
  assert(
    /^[a-z0-9][a-z0-9.-]*\.html$/u.test(directPage),
    'Direct page map is unsafe.'
  )
  const directTopic = await read(`${directEmbedBase}${directPage}`)
  assert(
    directRoot.text.includes('data-hia-skin-select'),
    'Direct output lacks skin switching.'
  )
  assert(
    directTopic.text.includes('data-hia-source-mode="embed"'),
    'Direct topic is not embed mode.'
  )
  assert(
    directTopic.text.includes('class="code-line"'),
    'Direct embed topic lacks source lines.'
  )

  // <lang><zh-CN>hia-jsdoc link 与 Portal bridge 各读取一个公开入口，证明 umbrella 的双 surface。</zh-CN><en>The hia-jsdoc link and Portal bridge each expose one public entry, proving the umbrella's two surfaces.</en></lang>
  const hiaLinkBase = 'profiles/hia-jsdoc/link/graphite/standalone/'
  const hiaRoot = await read(hiaLinkBase)
  const hiaPageMapResult = await readJson(`${hiaLinkBase}hia-page-map.json`)
  const hiaPage = hiaPageMapResult.value.pages?.[0]?.file
  assert(
    /^[a-z0-9][a-z0-9.-]*\.html$/u.test(hiaPage),
    'hia-jsdoc page map is unsafe.'
  )
  const hiaTopic = await read(`${hiaLinkBase}${hiaPage}`)
  assert(
    hiaRoot.text.includes('data-hia-skin="graphite"'),
    'hia-jsdoc selected skin drifted.'
  )
  assert(
    hiaTopic.text.includes('data-hia-source-mode="link"'),
    'hia-jsdoc topic is not link mode.'
  )
  assert(
    hiaTopic.text.includes('href="sources/'),
    'hia-jsdoc link topic lacks a same-origin source link.'
  )
  const bridgeRoot = await read('profiles/hia-jsdoc/fetch/lumen/portal-bridge/')
  assert(
    bridgeRoot.text.includes('hia-project-split-site'),
    'Portal bridge is not split-site.'
  )
  assert(
    bridgeRoot.text.includes('data-hia-skin="portal.lumen"'),
    'Portal bridge selected skin drifted.'
  )

  return {
    responses,
    verifiedProfiles: [
      'unified-portal.fetch.classic',
      'jphs-jth-native.embed.classic',
      'hia-jsdoc.link.graphite',
      'hia-jsdoc.fetch.lumen'
    ],
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
        contract: 'bp-js-cookie-documentation-showcase-online-check',
        contractVersion: '0.1.0-draft',
        status: 'public-pages-verified',
        canonicalUrl: PAGES_SITE.canonicalUrl,
        attempt,
        expectedCommit,
        resourceCount: result.responses.length,
        responses: result.responses,
        verifiedProfiles: result.verifiedProfiles,
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

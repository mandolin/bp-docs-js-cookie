/**
 * <lang><zh-CN>匿名验证已部署的 bp-docs-js-cookie GitHub Pages。</zh-CN><en>Anonymously verifies the deployed bp-docs-js-cookie GitHub Pages site.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-pages-online-check
 * @lang zh-CN 只允许 canonical Pages origin 下五个固定 GET，不携带 cookie、credential 或 source-link 请求。
 * @lang en Only five fixed GET requests under the canonical Pages origin are allowed; no cookies, credentials, or source-link requests are sent.
 */

import { execFileSync } from 'node:child_process'
import process from 'node:process'

import { PAGES_SITE } from './config.mjs'

/** @lang zh-CN 单个公开响应最大 4 MiB。 @lang en Maximum public response size is 4 MiB. */
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024
/** @lang zh-CN Pages 传播期的最多尝试次数。 @lang en Maximum attempts during Pages propagation. */
const MAX_ATTEMPTS = 12
/** @lang zh-CN 两次传播检查之间的毫秒数。 @lang en Milliseconds between propagation checks. */
const RETRY_DELAY_MS = 5000
/** @lang zh-CN 公开站固定检查路径。 @lang en Fixed public-site paths to check. */
const REQUIRED_PATHS = Object.freeze([
  '',
  'assets/hia-default.css',
  'assets/hia-default.js',
  'hia-manifest.json',
  'project-index.json'
])

/**
 * <lang><zh-CN>失败时停止线上验收。</zh-CN><en>Stops online acceptance on failure.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为真的条件。</zh-CN><en>Condition that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>公开安全的诊断。</zh-CN><en>Public-safe diagnostic.</en></lang>
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
 * <lang><zh-CN>读取同源、无凭据且有大小限制的公开资源。</zh-CN><en>Reads a same-origin, credential-free public resource with a size limit.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>canonical root 下的固定相对路径。</zh-CN><en>Fixed relative path under the canonical root.</en></lang>
 * @returns {Promise<{url: string, contentType: string, body: string, bytes: number}>} <lang><zh-CN>有界响应。</zh-CN><en>Bounded response.</en></lang>
 */
async function readPublicResource(relativePath) {
  /** @lang zh-CN 由固定 canonical root 解析的 URL。 @lang en URL resolved from the fixed canonical root. */
  const url = new URL(relativePath, PAGES_SITE.canonicalUrl)
  assert(
    url.origin === new URL(PAGES_SITE.canonicalUrl).origin,
    'Online check refused a cross-origin URL.'
  )
  assert(
    url.pathname.startsWith(PAGES_SITE.projectBasePath),
    'Online check refused a URL outside the project base path.'
  )
  /** @lang zh-CN 单请求 15 秒 abort 控制器。 @lang en Fifteen-second abort controller for one request. */
  const controller = new AbortController()
  /** @lang zh-CN 仅用于取消当前 GET 的 timer。 @lang en Timer used only to cancel the current GET. */
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    /** @lang zh-CN 匿名、无缓存、无 credential 的公开响应。 @lang en Anonymous, no-cache, credential-free public response. */
    const response = await fetch(url, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal
    })
    assert(
      response.status === 200,
      `${relativePath || '/'} returned HTTP ${response.status}.`
    )
    /** @lang zh-CN 响应字节先计数再解码。 @lang en Response bytes counted before decoding. */
    const bytes = new Uint8Array(await response.arrayBuffer())
    assert(
      bytes.byteLength <= MAX_RESPONSE_BYTES,
      `${relativePath || '/'} exceeded the response limit.`
    )
    return {
      url: url.href,
      contentType: response.headers.get('content-type') || '',
      body: new TextDecoder().decode(bytes),
      bytes: bytes.byteLength
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * <lang><zh-CN>执行一次完整公开站检查。</zh-CN><en>Runs one complete public-site check.</en></lang>
 *
 * @param {string} expectedCommit <lang><zh-CN>应出现在 source link 中的 exact BP commit。</zh-CN><en>Exact BP commit expected in source links.</en></lang>
 * @returns {Promise<{responses: Array<{path: string, bytes: number, contentType: string}>, sourceLinkCount: number}>} <lang><zh-CN>无正文验收摘要。</zh-CN><en>Body-free acceptance summary.</en></lang>
 */
async function checkOnce(expectedCommit) {
  /** @lang zh-CN 五个固定公开资源的响应。 @lang en Responses from the five fixed public resources. */
  const resources = []
  for (const relativePath of REQUIRED_PATHS) {
    resources.push(await readPublicResource(relativePath))
  }
  /** @lang zh-CN canonical root HTML。 @lang en Canonical root HTML. */
  const rootHtml = resources[0].body
  /** @lang zh-CN 已部署主题 CSS。 @lang en Deployed theme CSS. */
  const themeCss = resources[1].body
  /** @lang zh-CN HTML 与 manifest 中 exact source-link 次数。 @lang en Exact source-link count in HTML and manifest content. */
  const sourceLinkCount = (
    resources
      .map((resource) => resource.body)
      .join('\n')
      .match(new RegExp(`/blob/${expectedCommit}/`, 'gu')) || []
  ).length

  assert(
    rootHtml.includes('bp-docs-js-cookie 文档工程'),
    'Public root lacks the documentation-engineering title.'
  )
  assert(
    (rootHtml.match(/data-hia-project-entry=/gu) || []).length === 18,
    'Public root lacks all 18 no-script single-page entries.'
  )
  assert(
    rootHtml.includes('href="assets/hia-default.css"'),
    'Public stylesheet path is not project-relative.'
  )
  assert(
    rootHtml.includes('src="assets/hia-default.js"'),
    'Public script path is not project-relative.'
  )
  assert(
    themeCss.includes('overflow-wrap: anywhere'),
    'Public CSS lacks the long-field overflow fix.'
  )
  assert(
    themeCss.includes('grid-template-columns: minmax(0, 1fr)'),
    'Public CSS lacks the narrow single-column rule.'
  )
  assert(
    sourceLinkCount >= 18,
    'Public site lacks exact-revision source links.'
  )

  return {
    responses: REQUIRED_PATHS.map((relativePath, index) => ({
      path: relativePath || '/',
      bytes: resources[index].bytes,
      contentType: resources[index].contentType
    })),
    sourceLinkCount
  }
}

/**
 * <lang><zh-CN>在有界传播窗口内验证 canonical Pages。</zh-CN><en>Verifies canonical Pages within a bounded propagation window.</en></lang>
 *
 * @returns {Promise<void>}
 */
async function main() {
  /** @lang zh-CN 当前 BP exact commit；命令不读取工作树正文。 @lang en Current exact BP commit; the command does not read working-tree source bodies. */
  const expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: new URL('../..', import.meta.url),
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
      /** @lang zh-CN 当前尝试的无正文线上摘要。 @lang en Body-free online summary for the current attempt. */
      const result = await checkOnce(expectedCommit)
      process.stdout.write(
        `${JSON.stringify({ status: 'public-pages-verified', canonicalUrl: PAGES_SITE.canonicalUrl, attempt, expectedCommit, resourceCount: result.responses.length, responses: result.responses, sourceLinkCount: result.sourceLinkCount, privacyLeakCount: 0 })}\n`
      )
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

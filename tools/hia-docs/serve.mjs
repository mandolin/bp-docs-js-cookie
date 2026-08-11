/**
 * <lang><zh-CN>在 loopback 上提供 ignored Portal artifact，供 W-P111 真实浏览器验收。</zh-CN><en>Serves the ignored Portal artifact on loopback for W-P111 real-browser acceptance.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-serve
 * @lang zh-CN server 只绑定 127.0.0.1、只读取 Portal root，并拒绝 traversal、link 与目录列表。
 * @lang en The server binds only to 127.0.0.1, reads only the Portal root, and rejects traversal, links, and directory listings.
 */

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { PAGES_SITE, resolveTopology } from './config.mjs'

/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)
/** @lang zh-CN 固定 Portal document root。 @lang en Fixed Portal document root. */
const portalRoot = resolveTopology(repositoryRoot).portalOutputRoot
/** @lang zh-CN 用户可选的 loopback port。 @lang en Optional caller-selected loopback port. */
const port = Number(process.argv[2] || 4179)

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('Port must be an integer between 1024 and 65535.')
}
if (!fs.existsSync(path.join(portalRoot, 'index.html'))) {
  throw new Error(
    'Portal output is missing; run the documentation build first.'
  )
}

/** @lang zh-CN 静态文件 MIME 闭集。 @lang en Closed MIME set for static files. */
const CONTENT_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
})

/**
 * <lang><zh-CN>把 URL path 解析为 Portal root 内的普通文件。</zh-CN><en>Resolves a URL path to a regular file inside the Portal root.</en></lang>
 *
 * @param {string} requestUrl <lang><zh-CN>HTTP request URL。</zh-CN><en>HTTP request URL.</en></lang>
 * @returns {string | undefined} <lang><zh-CN>安全绝对文件路径，拒绝时为 undefined。</zh-CN><en>Safe absolute file path, or undefined when refused.</en></lang>
 */
function resolveRequestPath(requestUrl) {
  /** @lang zh-CN 不含 query/hash 的解码 pathname。 @lang en Decoded pathname without query or hash. */
  const pathname = decodeURIComponent(
    new URL(requestUrl, 'http://127.0.0.1').pathname
  )
  /** @lang zh-CN 模拟 GitHub project Pages base path 后的站内路径。 @lang en In-site path after simulating the GitHub project Pages base path. */
  const sitePath = pathname.startsWith(PAGES_SITE.projectBasePath)
    ? pathname.slice(PAGES_SITE.projectBasePath.length)
    : pathname === '/'
      ? ''
      : undefined
  if (sitePath === undefined) return undefined
  /** @lang zh-CN 站点根请求固定映射到 index.html。 @lang en Site-root requests map to index.html. */
  const relativePath =
    sitePath === '' ? 'index.html' : sitePath.replace(/^\/+/, '')
  /** @lang zh-CN 规范化后的 candidate 绝对路径。 @lang en Normalized absolute candidate path. */
  const candidate = path.resolve(portalRoot, relativePath)
  /** @lang zh-CN 用于边界验证的相对路径。 @lang en Relative path used for boundary validation. */
  const boundary = path.relative(portalRoot, candidate)
  if (boundary.startsWith('..') || path.isAbsolute(boundary)) return undefined
  if (!fs.existsSync(candidate)) return undefined
  /** @lang zh-CN lstat 防止生成目录中的 link 被跟随。 @lang en lstat prevents following a link in generated output. */
  const status = fs.lstatSync(candidate)
  if (!status.isFile() || status.isSymbolicLink()) return undefined
  return candidate
}

/** @lang zh-CN 只读 loopback 静态服务器。 @lang en Read-only loopback static server. */
const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' })
    response.end()
    return
  }
  /** @lang zh-CN 当前请求的安全文件路径。 @lang en Safe file path for the current request. */
  const filePath = resolveRequestPath(request.url || '/')
  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not Found')
    return
  }
  /** @lang zh-CN 扩展名对应的固定 MIME。 @lang en Fixed MIME corresponding to the extension. */
  const contentType =
    CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream'
  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': contentType
  })
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  fs.createReadStream(filePath).pipe(response)
})

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(
    `W-P111 Portal server: http://127.0.0.1:${port}${PAGES_SITE.projectBasePath}\n`
  )
})

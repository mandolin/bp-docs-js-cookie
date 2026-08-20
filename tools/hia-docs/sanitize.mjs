/**
 * <lang><zh-CN>清洗 JPHS/JTH、hia-jsdoc 与 Portal 生成 JSON，使三种公开源码模式都保持 body-free index 边界。</zh-CN><en>Sanitizes JPHS/JTH-, hia-jsdoc-, and Portal-generated JSON so all three public source modes retain a body-free index boundary.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-sanitize
 * @lang zh-CN 清洗器删除 source body、raw comment 与绝对路径，不改写用户可见的双语 API 说明。
 * @lang en The sanitizer removes source bodies, raw comments, and absolute paths without rewriting user-visible bilingual API descriptions.
 */

import fs from 'node:fs'
import path from 'node:path'

/** @lang zh-CN 无条件不得进入公开 JSON 的 JSDoc/runtime 字段。 @lang en JSDoc/runtime fields that must never enter public JSON. */
const ALWAYS_BLOCKED_KEYS = new Set([
  'comment',
  'filePath',
  'filename',
  'pathAbsolute',
  'primaryBlock',
  'sourceContent',
  'sourcePrimaryBlock',
  'sourcesContent'
])

/**
 * <lang><zh-CN>判断属性路径是否处于源码片段/预览子树。</zh-CN><en>Determines whether a property path is inside a source-fragment or preview subtree.</en></lang>
 *
 * @param {string[]} propertyPath <lang><zh-CN>从 JSON root 到当前值的属性名。</zh-CN><en>Property names from the JSON root to the current value.</en></lang>
 * @returns {boolean} <lang><zh-CN>当前值是否属于 source body carrier。</zh-CN><en>Whether the current value belongs to a source-body carrier.</en></lang>
 */
function isSourceCarrier(propertyPath) {
  return propertyPath.some((segment) =>
    /source|primaryBlock|preview|fragment|reference/i.test(segment)
  )
}

/**
 * <lang><zh-CN>判断字符串是否暴露 Windows/UNC/file URL 绝对定位。</zh-CN><en>Detects whether a string exposes Windows, UNC, or file-URL absolute location data.</en></lang>
 *
 * @param {unknown} value <lang><zh-CN>候选 JSON primitive。</zh-CN><en>Candidate JSON primitive.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否是禁止的绝对路径形态。</zh-CN><en>Whether it has a forbidden absolute-path shape.</en></lang>
 */
export function isAbsolutePathLike(value) {
  if (typeof value !== 'string') return false
  return (
    /^[A-Za-z]:[\\/]/u.test(value) ||
    /^\\\\/u.test(value) ||
    /^file:\/\//iu.test(value)
  )
}

/**
 * <lang><zh-CN>递归投影公开安全 JSON；数组顺序与非敏感对象键顺序保持不变。</zh-CN><en>Recursively projects public-safe JSON while preserving array order and non-sensitive object-key order.</en></lang>
 *
 * @param {unknown} value <lang><zh-CN>任意 JSON-compatible 输入。</zh-CN><en>Any JSON-compatible input.</en></lang>
 * @param {string[]} [propertyPath] <lang><zh-CN>递归内部使用的属性路径。</zh-CN><en>Property path used internally by recursion.</en></lang>
 * @returns {unknown} <lang><zh-CN>已移除隐私载荷的 JSON-compatible 值。</zh-CN><en>A JSON-compatible value with privacy payloads removed.</en></lang>
 */
export function sanitizeJsonValue(value, propertyPath = []) {
  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizeJsonValue(item, [...propertyPath, String(index)])
    )
  }

  if (value !== null && typeof value === 'object') {
    // <lang><zh-CN>新对象只接收通过 closed key/value gate 的字段，输入对象不原地修改。</zh-CN><en>A new object receives only fields that pass the closed key/value gate; the input object is not mutated.</en></lang>
    const result = {}
    for (const [key, item] of Object.entries(value)) {
      // <lang><zh-CN>raw comment 与明确路径/正文键在递归前删除，避免其子值绕过类型检查。</zh-CN><en>Raw-comment and explicit path/body keys are removed before recursion so their child values cannot bypass type checks.</en></lang>
      if (ALWAYS_BLOCKED_KEYS.has(key) || /filePath$/iu.test(key)) continue
      // <lang><zh-CN>`content` 只有位于 source carrier 时删除；普通 i18n/description 内容仍可公开呈现。</zh-CN><en>`content` is removed only inside a source carrier; ordinary i18n and description content remains publishable.</en></lang>
      if (key === 'content' && isSourceCarrier(propertyPath)) continue
      // <lang><zh-CN>source preview 是正文 carrier；fetch/link 的正文属于 `.txt` asset，embed 的正文属于 topic HTML，JSON 中必须整体省略 preview。</zh-CN><en>A source preview is a body carrier; fetch/link bodies belong in `.txt` assets and embed bodies in topic HTML, so JSON must omit the preview entirely.</en></lang>
      if (key === 'preview' && isSourceCarrier(propertyPath)) continue

      // <lang><zh-CN>递归结果若是绝对路径则整字段省略，不用本机路径生成可逆替代值。</zh-CN><en>If the recursive result is an absolute path, omit the whole field instead of producing a reversible host-path substitute.</en></lang>
      const sanitized = sanitizeJsonValue(item, [...propertyPath, key])
      if (!isAbsolutePathLike(sanitized)) result[key] = sanitized
    }
    return result
  }

  return value
}

/**
 * <lang><zh-CN>读取、清洗并确定性写出一个 JSON 文件。</zh-CN><en>Reads, sanitizes, and deterministically writes one JSON file.</en></lang>
 *
 * @param {string} inputPath <lang><zh-CN>只读 input JSON 路径。</zh-CN><en>Read-only input JSON path.</en></lang>
 * @param {string} outputPath <lang><zh-CN>允许覆盖的目标 JSON 路径。</zh-CN><en>Destination JSON path that may be replaced.</en></lang>
 * @returns {unknown} <lang><zh-CN>已写出的清洗对象。</zh-CN><en>The sanitized object that was written.</en></lang>
 */
export function sanitizeJsonFile(inputPath, outputPath) {
  // <lang><zh-CN>JSON parser 先完整验证结构；畸形 producer output 会 fail closed，不产生部分公开文件。</zh-CN><en>The JSON parser validates the complete structure first; malformed producer output fails closed and produces no partial public file.</en></lang>
  const parsed = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const sanitized = sanitizeJsonValue(parsed)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(sanitized, null, 2)}\n`,
    'utf8'
  )
  return sanitized
}

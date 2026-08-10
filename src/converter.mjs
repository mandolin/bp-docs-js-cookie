/**
 * <lang><zh-CN>定义 js-cookie 的默认 Cookie 值编解码边界。</zh-CN><en>Defines the default Cookie value encoding and decoding boundary for js-cookie.</en></lang>
 *
 * @module js-cookie/converter
 * @lang zh-CN converter 只处理 Cookie 值；名称编码、属性序列化和 `document.cookie` 副作用由 API 模块负责。
 * @lang en The converter handles Cookie values only; name encoding, attribute serialization, and the `document.cookie` side effect belong to the API module.
 */

/**
 * <lang><zh-CN>js-cookie 的默认百分号编解码 converter。</zh-CN><en>The default percent-encoding converter used by js-cookie.</en></lang>
 *
 * @type {Object}
 * @property {function(string): string} read <lang><zh-CN>把浏览器 Cookie 值解码为调用方字符串。</zh-CN><en>Decodes a browser Cookie value into a caller-facing string.</en></lang>
 * @property {function(string): string} write <lang><zh-CN>把调用方字符串编码为可写入 Cookie 的值。</zh-CN><en>Encodes a caller-facing string as a value suitable for a Cookie write.</en></lang>
 * @lang zh-CN 读写两侧保留 RFC 6265 允许的字符集合，不执行 JSON、Base64 或业务级转换。
 * @lang en Both directions preserve the RFC 6265-compatible character set and perform no JSON, Base64, or domain-level conversion.
 */
export default {
  /**
   * <lang><zh-CN>移除浏览器可能保留的外层双引号，并解码连续百分号字节序列。</zh-CN><en>Removes outer double quotes that a browser may preserve and decodes contiguous percent-byte sequences.</en></lang>
   *
   * @param {string} value <lang><zh-CN>从 `document.cookie` 分离出的原始值片段。</zh-CN><en>The raw value segment separated from `document.cookie`.</en></lang>
   * @returns {string} <lang><zh-CN>解码后的 Cookie 值。</zh-CN><en>The decoded Cookie value.</en></lang>
   * @throws {URIError} <lang><zh-CN>百分号序列不是有效 URI 编码时由 `decodeURIComponent` 抛出；上层 get 会按单个 Cookie 隔离该失败。</zh-CN><en>Thrown by `decodeURIComponent` when a percent sequence is not valid URI encoding; the higher-level getter isolates this failure per Cookie.</en></lang>
   * @lang zh-CN 只解码形如 `%HH` 的连续序列，避免把普通百分号交给 URI decoder。
   * @lang en Decodes only contiguous `%HH` sequences so ordinary percent signs are not passed to the URI decoder.
   */
  read: function (value) {
    // <lang><zh-CN>RFC 兼容服务器可能返回 quoted cookie-value；仅当首字符为双引号时移除首尾包裹。</zh-CN><en>RFC-compatible servers may return a quoted cookie-value; remove the outer pair only when the first character is a double quote.</en></lang>
    if (value[0] === '"') {
      value = value.slice(1, -1)
    }
    // <lang><zh-CN>每个连续百分号字节组独立解码；畸形组抛错并由 API 读取循环按 Cookie 隔离。</zh-CN><en>Decode each contiguous percent-byte group independently; malformed groups throw and are isolated per Cookie by the API read loop.</en></lang>
    return value.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent)
  },
  /**
   * <lang><zh-CN>将调用方字符串编码为 Cookie 值，同时恢复规范允许直接出现的字符。</zh-CN><en>Encodes a caller-facing string as a Cookie value while restoring characters permitted to appear directly.</en></lang>
   *
   * @param {string} value <lang><zh-CN>要写入的调用方字符串；非字符串输入沿用 `encodeURIComponent` 的强制转换。</zh-CN><en>The caller-facing value to write; non-string inputs retain `encodeURIComponent` coercion behavior.</en></lang>
   * @returns {string} <lang><zh-CN>可拼接到 `name=value` Cookie 字符串中的编码值。</zh-CN><en>The encoded value suitable for concatenation into a `name=value` Cookie string.</en></lang>
   * @throws {URIError} <lang><zh-CN>输入包含无法编码的孤立 UTF-16 surrogate 时由 `encodeURIComponent` 抛出。</zh-CN><en>Thrown by `encodeURIComponent` when the input contains an unencodable lone UTF-16 surrogate.</en></lang>
   * @lang zh-CN 不负责属性或名称编码，因而不会改变 API 层的序列化顺序。
   * @lang en Does not encode attributes or names and therefore cannot change API-layer serialization order.
   */
  write: function (value) {
    // <lang><zh-CN>先执行 URI 组件编码，再仅还原 Cookie 值允许的标点，避免扩大未转义字符集合。</zh-CN><en>Apply URI-component encoding first, then restore only Cookie-value punctuation so the unescaped set is not broadened.</en></lang>
    return encodeURIComponent(value).replace(
      /%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g,
      decodeURIComponent
    )
  }
}

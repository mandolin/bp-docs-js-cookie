/**
 * <lang><zh-CN>实现 js-cookie 的浏览器 Cookie API 工厂及默认实例。</zh-CN><en>Implements the js-cookie browser Cookie API factory and default instance.</en></lang>
 *
 * @module js-cookie/api
 * @lang zh-CN 该模块只通过 `document.cookie` 读写当前文档可见的 Cookie，不提供 HttpOnly、网络请求或服务端 Cookie 能力。
 * @lang en This module reads and writes only Cookies visible to the current document through `document.cookie`; it provides no HttpOnly, network-request, or server-side Cookie capability.
 */

import assign from './assign.mjs'
import defaultConverter from './converter.mjs'

/**
 * <lang><zh-CN>一次 Cookie 写入可使用的属性集合。</zh-CN><en>The attribute set accepted by a Cookie write.</en></lang>
 *
 * @typedef {Object} CookieAttributes
 * @property {(number|Date|string)} [expires] <lang><zh-CN>数字表示从当前时刻起的天数；Date 或字符串按既有序列化路径处理。</zh-CN><en>A number is a day offset from now; a Date or string follows the established serialization path.</en></lang>
 * @property {string} [path] <lang><zh-CN>Cookie 的路径属性。</zh-CN><en>The Cookie path attribute.</en></lang>
 * @property {string} [domain] <lang><zh-CN>Cookie 的域属性。</zh-CN><en>The Cookie domain attribute.</en></lang>
 * @property {boolean} [secure] <lang><zh-CN>是否附加无值的 Secure 属性。</zh-CN><en>Whether to append the valueless Secure attribute.</en></lang>
 * @property {string} [sameSite] <lang><zh-CN>调用方选择的 SameSite 值；浏览器负责最终接受策略。</zh-CN><en>The caller-selected SameSite value; the browser owns final acceptance policy.</en></lang>
 */

/**
 * <lang><zh-CN>Cookie 值读写转换器。</zh-CN><en>A converter for Cookie values in both directions.</en></lang>
 *
 * @typedef {Object} CookieConverter
 * @property {function(string, string=): string} read <lang><zh-CN>将 Cookie 值解码为调用方字符串，可选接收已解码名称。</zh-CN><en>Decodes a Cookie value into a caller-facing string and may receive the decoded name.</en></lang>
 * @property {function(*, string=): string} write <lang><zh-CN>将调用方值编码为 Cookie 字符串，可选接收已编码名称。</zh-CN><en>Encodes a caller value as a Cookie string and may receive the encoded name.</en></lang>
 */

/**
 * <lang><zh-CN>由工厂返回的不可变配置 Cookie API。</zh-CN><en>The immutable-configuration Cookie API returned by the factory.</en></lang>
 *
 * @typedef {Object} CookieApi
 * @property {function(string, *, CookieAttributes=): (string|undefined)} set <lang><zh-CN>写入 Cookie，并在无 DOM 时返回 undefined。</zh-CN><en>Writes a Cookie and returns undefined when no DOM is available.</en></lang>
 * @property {function(string=): (string|Object|undefined)} get <lang><zh-CN>读取一个名称或当前文档可见的全部 Cookie。</zh-CN><en>Reads one named Cookie or all Cookies visible to the current document.</en></lang>
 * @property {function(string, CookieAttributes=): void} remove <lang><zh-CN>用立即过期值删除匹配名称和作用域的 Cookie。</zh-CN><en>Removes a Cookie matching the supplied name and scope by writing an immediately expired value.</en></lang>
 * @property {function(CookieAttributes): CookieApi} withAttributes <lang><zh-CN>派生一个合并默认属性的新 API。</zh-CN><en>Derives a new API with merged default attributes.</en></lang>
 * @property {function(CookieConverter): CookieApi} withConverter <lang><zh-CN>派生一个合并 converter 的新 API。</zh-CN><en>Derives a new API with a merged converter.</en></lang>
 * @property {CookieAttributes} attributes <lang><zh-CN>冻结的默认属性。</zh-CN><en>The frozen default attributes.</en></lang>
 * @property {CookieConverter} converter <lang><zh-CN>冻结的值转换器。</zh-CN><en>The frozen value converter.</en></lang>
 */

/**
 * <lang><zh-CN>用指定 converter 和默认属性创建一个隔离配置的 Cookie API。</zh-CN><en>Creates an independently configured Cookie API from a converter and default attributes.</en></lang>
 *
 * @param {CookieConverter} converter <lang><zh-CN>API 的值编解码策略；派生 API 会复制其可枚举键。</zh-CN><en>The API value codec; derived APIs copy its enumerable keys.</en></lang>
 * @param {CookieAttributes} defaultAttributes <lang><zh-CN>每次写入前合并的默认属性。</zh-CN><en>Default attributes merged before every write.</en></lang>
 * @returns {CookieApi} <lang><zh-CN>拥有冻结配置和共享方法原型的新 API 对象。</zh-CN><en>A new API object with frozen configuration and a shared method prototype.</en></lang>
 * @private
 * @lang zh-CN 工厂不读取 Cookie；只有返回对象的方法在调用时访问 `document.cookie`。
 * @lang en The factory does not read Cookies; only methods on the returned object access `document.cookie` when invoked.
 */
function init(converter, defaultAttributes) {
  /**
   * <lang><zh-CN>序列化并写入一个浏览器 Cookie。</zh-CN><en>Serializes and writes one browser Cookie.</en></lang>
   *
   * @param {string} name <lang><zh-CN>Cookie 名称。</zh-CN><en>The Cookie name.</en></lang>
   * @param {*} value <lang><zh-CN>交给当前 converter 编码的调用方值。</zh-CN><en>The caller value passed to the current converter.</en></lang>
   * @param {CookieAttributes} [attributes] <lang><zh-CN>覆盖当前默认值的本次写入属性。</zh-CN><en>Per-write attributes that override current defaults.</en></lang>
   * @returns {(string|undefined)} <lang><zh-CN>浏览器接受的赋值字符串；无 DOM 环境返回 undefined。</zh-CN><en>The string accepted by the browser assignment, or undefined without a DOM.</en></lang>
   * @throws {URIError} <lang><zh-CN>名称或值包含无法进行 URI 编码的输入时抛出。</zh-CN><en>Thrown when the name or value contains input that cannot be URI-encoded.</en></lang>
   * @lang zh-CN 该方法会修改当前文档 Cookie 状态；浏览器仍可依据域、路径、安全上下文和 Cookie 策略拒绝或调整写入。
   * @lang en This method mutates current-document Cookie state; the browser may still reject or adjust the write according to domain, path, secure-context, and Cookie policy.
   */
  function set(name, value, attributes) {
    // <lang><zh-CN>SSR、Node 或其他无 DOM 环境没有 `document.cookie` 写入面，因此在任何转换和副作用前返回。</zh-CN><en>SSR, Node, and other DOM-less environments have no `document.cookie` write surface, so return before conversion or side effects.</en></lang>
    if (typeof document === 'undefined') {
      return
    }

    // <lang><zh-CN>每次写入创建新的属性对象；调用方对象和冻结的默认属性都不会被后续规范化步骤原地修改。</zh-CN><en>Create a fresh attribute object for each write so later normalization mutates neither the caller object nor frozen defaults.</en></lang>
    attributes = assign({}, defaultAttributes, attributes)

    // <lang><zh-CN>数字 expires 的单位是天；864e5 把天转换为毫秒，并以当前时刻构造绝对 Date。</zh-CN><en>A numeric expires value is measured in days; 864e5 converts days to milliseconds before an absolute Date is created from now.</en></lang>
    if (typeof attributes.expires === 'number') {
      attributes.expires = new Date(Date.now() + attributes.expires * 864e5)
    }
    // <lang><zh-CN>任何 truthy expires 都沿用其 `toUTCString` 契约，得到浏览器 Cookie 属性需要的 UTC 文本。</zh-CN><en>Any truthy expires value follows its `toUTCString` contract to produce the UTC text required by the browser Cookie attribute.</en></lang>
    if (attributes.expires) {
      attributes.expires = attributes.expires.toUTCString()
    }

    // <lang><zh-CN>名称先做 URI 组件编码，再恢复 Cookie 名称允许的字符；括号继续采用历史 `escape` 表示以保持产物兼容。</zh-CN><en>Encode the name as a URI component, then restore Cookie-name characters; parentheses keep the historical `escape` representation for artifact compatibility.</en></lang>
    name = encodeURIComponent(name)
      .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
      .replace(/[()]/g, escape)

    // <lang><zh-CN>该可变累加器只保存本次写入的属性后缀，初始为空以便直接拼到 `name=value`。</zh-CN><en>This mutable accumulator holds only the current write's attribute suffix and starts empty for direct concatenation onto `name=value`.</en></lang>
    var stringifiedAttributes = ''
    // <lang><zh-CN>属性名来自合并结果的可枚举键；枚举顺序保持上游对象组合行为。</zh-CN><en>Attribute names come from enumerable keys on the merged result; enumeration order retains upstream object-composition behavior.</en></lang>
    for (var attributeName in attributes) {
      // <lang><zh-CN>falsy 属性表示本次不输出该标记或键值对，避免产生无意义的 `; key=`。</zh-CN><en>A falsy attribute suppresses that flag or pair for this write and avoids a meaningless `; key=`.</en></lang>
      if (!attributes[attributeName]) {
        continue
      }

      // <lang><zh-CN>每个启用属性先写入名称；布尔 true 属性到此结束，形成 Secure 等无值标记。</zh-CN><en>Append every enabled attribute name first; a boolean true ends here and forms a valueless flag such as Secure.</en></lang>
      stringifiedAttributes += '; ' + attributeName

      if (attributes[attributeName] === true) {
        continue
      }

      // <lang><zh-CN>依据 RFC 6265 §5.2 的属性解析边界，只保留首个分号之前的文本，防止一个值注入后续 Cookie 属性。</zh-CN><en>Following the RFC 6265 §5.2 attribute parsing boundary, retain only text before the first semicolon so one value cannot inject later Cookie attributes.</en></lang>
      stringifiedAttributes += '=' + attributes[attributeName].split(';')[0]
    }

    // <lang><zh-CN>唯一运行时副作用在这里发生：converter 输出与属性后缀组成完整字符串并赋给当前文档。</zh-CN><en>The sole runtime side effect occurs here: converter output and the attribute suffix form the complete string assigned to the current document.</en></lang>
    return (document.cookie =
      name + '=' + converter.write(value, name) + stringifiedAttributes)
  }

  /**
   * <lang><zh-CN>读取指定 Cookie，或返回当前文档可见 Cookie 的名称到值映射。</zh-CN><en>Reads one named Cookie or returns a name-to-value map of Cookies visible to the current document.</en></lang>
   *
   * @param {string} [name] <lang><zh-CN>可选 Cookie 名称；省略时收集全部可解码项。</zh-CN><en>An optional Cookie name; omit it to collect every decodable entry.</en></lang>
   * @returns {(string|Object|undefined)} <lang><zh-CN>名称对应值、全部值映射，或在无 DOM/无效空名称时为 undefined。</zh-CN><en>The named value, a map of all values, or undefined without a DOM or for an invalid empty name.</en></lang>
   * @lang zh-CN 单个畸形 Cookie 的解码错误会被隔离，不阻断其他可见 Cookie 的读取。
   * @lang en A decoding error in one malformed Cookie is isolated and does not block other visible Cookies.
   */
  function get(name) {
    // <lang><zh-CN>无 DOM 时不可读取；显式调用 get('') 也保持历史 undefined，而无参数 get() 仍返回映射。</zh-CN><en>Reading is unavailable without a DOM; an explicit get('') retains historical undefined while zero-argument get() still returns a map.</en></lang>
    if (typeof document === 'undefined' || (arguments.length && !name)) {
      return
    }

    // <lang><zh-CN>Cookie header 为空时使用空数组，使后续循环自然跳过且无需特殊分支。</zh-CN><en>Use an empty array when the Cookie header is empty so the later loop naturally skips without a special branch.</en></lang>
    var cookies = document.cookie ? document.cookie.split('; ') : []
    // <lang><zh-CN>结果 jar 只在本次调用内生存；键是解码名称，值是 converter 读取结果。</zh-CN><en>The result jar lives only for this call; keys are decoded names and values are converter read results.</en></lang>
    var jar = {}
    // <lang><zh-CN>索引按浏览器返回顺序扫描 Cookie 片段，以保留首个可见同名项的既有选择规则。</zh-CN><en>The index scans Cookie segments in browser-returned order to retain the established first-visible-duplicate selection rule.</en></lang>
    for (var i = 0; i < cookies.length; i++) {
      // <lang><zh-CN>当前片段按等号拆分；第一个元素是名称，其余元素稍后重新拼接为允许含等号的值。</zh-CN><en>Split the current segment on equals signs; the first item is the name and the remaining items are rejoined so values may contain equals signs.</en></lang>
      var parts = cookies[i].split('=')
      // <lang><zh-CN>当前原始值仅在本轮解码中使用；slice/join 保留首个等号后的完整内容。</zh-CN><en>The current raw value is used only for this iteration; slice/join preserves all content after the first equals sign.</en></lang>
      var value = parts.slice(1).join('=')

      try {
        // <lang><zh-CN>当前 found 名称来自首段 URI 解码，并作为 jar identity 与 converter 上下文使用。</zh-CN><en>The current found name comes from URI-decoding the first segment and serves as both jar identity and converter context.</en></lang>
        var found = decodeURIComponent(parts[0])
        // <lang><zh-CN>只记录首个可见同名 Cookie；`in` 同时避免覆盖对象原型上已有的名称。</zh-CN><en>Record only the first visible Cookie of a name; `in` also avoids overwriting names already present on the object prototype.</en></lang>
        if (!(found in jar)) jar[found] = converter.read(value, found)
        // <lang><zh-CN>请求单个名称且已经命中时提前结束，避免无关 Cookie 的后续解码成本与错误。</zh-CN><en>When a requested name has been found, stop early to avoid later decoding cost and errors from unrelated Cookies.</en></lang>
        if (name === found) {
          break
        }
      } catch (_e) {
        // <lang><zh-CN>名称或值的 URI 解码失败只丢弃当前 Cookie；错误对象不返回、不记录，也不暴露 Cookie 内容。</zh-CN><en>A URI-decoding failure in a name or value discards only the current Cookie; the error is neither returned nor logged, and no Cookie content is exposed.</en></lang>
      }
    }

    // <lang><zh-CN>有名称时返回对应值；无参数时返回本次构建的完整 jar，二者都不保留跨调用状态。</zh-CN><en>Return the corresponding value when named, otherwise the complete jar built for this call; neither path retains cross-call state.</en></lang>
    return name ? jar[name] : jar
  }

  // <lang><zh-CN>Object.create 把共享方法与只读配置分层：方法位于 prototype，冻结的配置位于实例自有描述符。</zh-CN><en>Object.create separates shared methods from read-only configuration: methods live on the prototype and frozen configuration lives in own instance descriptors.</en></lang>
  return Object.create(
    {
      set: set,
      get: get,
      /**
       * <lang><zh-CN>通过立即过期写入删除匹配名称、路径和域的 Cookie。</zh-CN><en>Removes a Cookie matching the supplied name, path, and domain through an immediately expired write.</en></lang>
       *
       * @param {string} name <lang><zh-CN>要删除的 Cookie 名称。</zh-CN><en>The Cookie name to remove.</en></lang>
       * @param {CookieAttributes} [attributes] <lang><zh-CN>必须与原 Cookie 作用域匹配的路径、域等属性。</zh-CN><en>Path, domain, and other attributes that must match the original Cookie scope.</en></lang>
       * @returns {void}
       * @lang zh-CN 删除仍是一次 `document.cookie` 写入；浏览器决定是否存在匹配 Cookie。
       * @lang en Removal is still a `document.cookie` write; the browser decides whether a matching Cookie exists.
       */
      remove: function (name, attributes) {
        // <lang><zh-CN>在调用方属性之上固定 expires=-1，使 set 将其转换为过去的绝对 UTC 时间。</zh-CN><en>Fix expires=-1 over caller attributes so set converts it to an absolute UTC time in the past.</en></lang>
        set(
          name,
          '',
          assign({}, attributes, {
            expires: -1
          })
        )
      },
      /**
       * <lang><zh-CN>派生一个使用合并默认属性的新 Cookie API。</zh-CN><en>Derives a new Cookie API that uses merged default attributes.</en></lang>
       *
       * @param {CookieAttributes} attributes <lang><zh-CN>覆盖当前默认值的属性。</zh-CN><en>Attributes that override current defaults.</en></lang>
       * @returns {CookieApi} <lang><zh-CN>converter 不变、属性配置独立冻结的新 API。</zh-CN><en>A new API with the same converter and independently frozen attributes.</en></lang>
       */
      withAttributes: function (attributes) {
        // <lang><zh-CN>合并到新对象后重新进入工厂，避免修改当前实例的冻结 attributes。</zh-CN><en>Merge into a new object and re-enter the factory so the current instance's frozen attributes are not modified.</en></lang>
        return init(this.converter, assign({}, this.attributes, attributes))
      },
      /**
       * <lang><zh-CN>派生一个使用合并值转换器的新 Cookie API。</zh-CN><en>Derives a new Cookie API that uses a merged value converter.</en></lang>
       *
       * @param {CookieConverter} converter <lang><zh-CN>覆盖当前 read/write 成员的 converter 片段。</zh-CN><en>A converter fragment that overrides current read/write members.</en></lang>
       * @returns {CookieApi} <lang><zh-CN>默认属性不变、converter 配置独立冻结的新 API。</zh-CN><en>A new API with unchanged default attributes and an independently frozen converter.</en></lang>
       */
      withConverter: function (converter) {
        // <lang><zh-CN>当前 converter 先复制、调用方片段后覆盖；当前实例不发生原地变更。</zh-CN><en>Copy the current converter first and apply the caller fragment afterward; the current instance is not mutated.</en></lang>
        return init(assign({}, this.converter, converter), this.attributes)
      }
    },
    {
      // <lang><zh-CN>两个实例配置值分别冻结且描述符保持默认只读/不可枚举，调用方只能通过 with* 派生新实例。</zh-CN><en>Both instance configuration values are frozen and their descriptors retain default read-only/non-enumerable flags, so callers derive new instances through with* methods.</en></lang>
      attributes: { value: Object.freeze(defaultAttributes) },
      converter: { value: Object.freeze(converter) }
    }
  )
}

/**
 * <lang><zh-CN>使用默认 converter 与根路径属性的 js-cookie API 实例。</zh-CN><en>The js-cookie API instance configured with the default converter and root path attribute.</en></lang>
 *
 * @type {CookieApi}
 * @lang zh-CN 该导出在模块加载时只冻结配置，不访问 `document.cookie`；读写副作用发生在方法调用时。
 * @lang en Module loading freezes configuration only and does not access `document.cookie`; read/write side effects occur when methods are called.
 */
export default init(defaultConverter, { path: '/' })

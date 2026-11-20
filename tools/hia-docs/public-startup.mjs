/**
 * @file
 * @lang zh-CN 首绘前恢复既有产品布局、语言及偏好；交互由完整运行时负责。
 * @lang en Restore existing product layout, language and preferences before paint; the full runtime owns interactions.
 */

/** @lang zh-CN 默认值与闭集在首绘及交互阶段共用，不增加偏好语义。 @lang en Defaults and closed sets are shared by first paint and interactive startup without adding preference semantics. */
export const PUBLIC_PREFERENCES = Object.freeze({
  defaults: {
    siteTheme: 'light',
    codeTheme: 'site',
    codeFontSize: 'default',
    codeWrap: 'scroll',
    codeLines: 'show',
    contentWidth: 'comfortable',
    apiScope: 'public',
    metadata: 'hide',
    contract: 'show',
    coverage: 'hide',
    provenance: 'show',
    relations: 'hide'
  },
  allowed: {
    siteTheme: ['system', 'light', 'dark'],
    codeTheme: [
      'site',
      'paper-light',
      'midnight',
      'solarized-light',
      'solarized-dark',
      'high-contrast'
    ],
    codeFontSize: ['small', 'default', 'large'],
    codeWrap: ['scroll', 'wrap'],
    codeLines: ['hide', 'show'],
    contentWidth: ['comfortable', 'wide'],
    apiScope: ['public', 'all'],
    metadata: ['hide', 'show'],
    contract: ['hide', 'show'],
    coverage: ['hide', 'show'],
    provenance: ['hide', 'show'],
    relations: ['hide', 'show']
  }
})

/**
 * @lang zh-CN 在解析正文前建立首绘状态；不写存储、不绑定交互，真实完成或失败事件释放临时状态。
 * @lang en Establish first-paint state before body parsing; no storage writes or interaction binding, with temporary state released by actual completion or failure events.
 * @returns {void} <lang><zh-CN>仅更新本页DOM及临时监听器。</zh-CN><en>Only updates this page's DOM and temporary listeners.</en></lang>
 */
function initializePublicPaint() {
  /** @lang zh-CN 根节点承载与最终运行时相同的布局状态。 @lang en The root carries the same layout state as the final runtime. */
  const root = document.documentElement
  /** @lang zh-CN 静态词典位于当前同步脚本之前，不依赖网络。 @lang en The static dictionary precedes this synchronous script and requires no network. */
  const messages = JSON.parse(
    document.querySelector('[data-hia-public-messages]').textContent
  )
  /** @lang zh-CN 构建器注入共享闭集，避免两个初始化阶段漂移。 @lang en The builder injects shared closed sets to prevent divergence between startup phases. */
  const policy = JSON.parse(
    document.querySelector('[data-hia-public-preferences]').textContent
  )
  /** @lang zh-CN 存储不可用或内容无效时沿静态默认值继续。 @lang en Continue with static defaults when storage is unavailable or invalid. */
  let saved = {}
  /** @lang zh-CN 显式语言路径优先，普通根页才读取设备语言。 @lang en Explicit language routes take precedence; only the neutral root reads device language. */
  let locale = root.dataset.hiaPublicRouteLocale
  try {
    saved = JSON.parse(
      localStorage.getItem('hia.bp-docs-js-cookie.display.v3') || '{}'
    )
  } catch {
    /* <lang><zh-CN>拒绝存储不阻断阅读。</zh-CN><en>Denied storage does not block reading.</en></lang> */
  }
  // <lang><zh-CN>语言存储独立读取，损坏的显示偏好不得阻断有效语言。</zh-CN><en>Read locale storage independently so malformed display preferences cannot block a valid locale.</en></lang>
  try {
    if (!locale) locale = localStorage.getItem('hia-doc-portal-ui-locale')
  } catch {
    /* <lang><zh-CN>无权读取语言时保留静态语言。</zh-CN><en>Retain static language when locale reads are denied.</en></lang> */
  }
  if (!['zh-CN', 'en'].includes(locale))
    locale = root.lang === 'en' ? 'en' : 'zh-CN'
  root.lang = locale
  /** @lang zh-CN 映射只接受现有偏好字段及值，不允许存储内容提供属性名。 @lang en This mapping accepts only existing preference fields and values, never storage-provided attribute names. */
  const attributes = {
    siteTheme: 'hiaScheme',
    codeTheme: 'hiaCodeTheme',
    codeFontSize: 'hiaCodeFontSize',
    codeWrap: 'hiaCodeWrap',
    codeLines: 'hiaCodeLines',
    contentWidth: 'hiaContentWidth',
    apiScope: 'hiaApiScope',
    metadata: 'hiaShowMetadata',
    contract: 'hiaShowContract',
    coverage: 'hiaShowCoverage',
    provenance: 'hiaShowProvenance',
    relations: 'hiaShowRelations'
  }
  for (const [field, attribute] of Object.entries(attributes)) {
    root.dataset[attribute] = policy.allowed[field].includes(saved?.[field])
      ? saved[field]
      : policy.defaults[field]
  }
  /**
   * @lang zh-CN 只更新产品壳的标记文本，不触碰代码、API正文或已相同的文本节点。
   * @lang en Update only marked product-shell text, leaving code, API content and already equal text nodes untouched.
   * @returns {void} <lang><zh-CN>解析器新加入的可见节点立即采用最终语言。</zh-CN><en>Newly parsed visible nodes immediately use the final language.</en></lang>
   */
  function translateParsedNodes() {
    for (const [selector, attribute] of [
      ['data-hia-public-i18n', null],
      ['data-hia-public-i18n-aria', 'aria-label'],
      ['data-hia-public-i18n-placeholder', 'placeholder']
    ]) {
      for (const node of document.querySelectorAll(`[${selector}]`)) {
        /** @lang zh-CN 字段身份来自构建器；未知消息不改变原正文。 @lang en Field identity comes from the builder; unknown messages leave original content unchanged. */
        const text = messages[locale]?.[node.getAttribute(selector)]
        if (typeof text !== 'string') continue
        if (attribute) {
          if (node.getAttribute(attribute) !== text)
            node.setAttribute(attribute, text)
        } else if (node.textContent !== text) node.textContent = text
      }
    }
  }
  /**
   * @lang zh-CN 完成时释放观察器；失败时移除临时布局使原静态回退恢复。
   * @lang en Release the observer on completion; on failure remove temporary layout to restore the original static fallback.
   * @returns {void} <lang><zh-CN>幂等清理临时状态及监听器。</zh-CN><en>Idempotently clean up temporary state and listeners.</en></lang>
   */
  function finish() {
    observer.disconnect()
    root.removeAttribute('data-hia-public-starting')
    window.removeEventListener('error', failed, true)
    window.removeEventListener('unhandledrejection', finish)
  }
  /**
   * @lang zh-CN 主运行时加载失败或初始化抛错才回退，非必要高亮资产失败不改变布局。
   * @lang en Fall back on main-runtime load failure or initialization exceptions; optional highlighting failures do not change layout.
   * @param {Event} event <lang><zh-CN>捕获的真实错误事件。</zh-CN><en>Actual captured error event.</en></lang>
   * @returns {void} <lang><zh-CN>必要时恢复静态阅读。</zh-CN><en>Restore static reading when needed.</en></lang>
   */
  function failed(event) {
    if (
      event instanceof ErrorEvent ||
      /\/hia-public-product\.js(?:\?|$)/.test(event.target?.src || '')
    )
      finish()
  }
  /** @lang zh-CN 观察解析器增量及完成标记，不等待定时器或网络静默。 @lang en Observe parser additions and the completion marker without timers or network-idle assumptions. */
  const observer = new MutationObserver(() => {
    if (!root.classList.contains('no-js')) finish()
    else translateParsedNodes()
  })
  observer.observe(document, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  })
  window.addEventListener('error', failed, true)
  window.addEventListener('unhandledrejection', finish)
  root.setAttribute('data-hia-public-starting', '')
}

/**
 * @lang zh-CN 生成仅使用本页数据的同步首绘脚本，保留无脚本回退。
 * @lang en Generate a synchronous first-paint script using page-local data while retaining the no-script fallback.
 * @returns {string} <lang><zh-CN>可直接插入head的脚本。</zh-CN><en>A script ready for head insertion.</en></lang>
 */
export function renderPublicPaintBootstrap() {
  return `<script data-hia-public-startup>(${initializePublicPaint.toString()})()</script>`
}

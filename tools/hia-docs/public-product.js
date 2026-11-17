/**
 * <lang><zh-CN>实现 bp-docs-js-cookie 默认 Portal 的产品壳、显示偏好、移动导航、页内目录与公开代码复制。</zh-CN><en>Implements the product shell, display preferences, mobile navigation, local outline, and public-code copying for the bp-docs-js-cookie default Portal.</en></lang>
 *
 * @module bp-docs-js-cookie/public-product-runtime
 * @lang zh-CN 运行时交互范围为同页 DOM、设备本地显示偏好，以及读者原生激活后的公开代码剪贴板写入。
 * @lang en Runtime interactions cover the same-page DOM, device-local display preferences, and clipboard writes of public code after native reader activation.
 */

;(() => {
  /** @lang zh-CN 产品偏好的单一设备本地 key。 @lang en Sole device-local key for product preferences. */
  const storageKey = 'hia.bp-docs-js-cookie.display.v3'
  /** @lang zh-CN 未找到有效设备偏好时使用的确认稿默认值。 @lang en Confirmed-baseline defaults used when no valid device preference exists. */
  const defaults = Object.freeze({
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
  })
  /** @lang zh-CN 每个偏好字段的 closed value set。 @lang en Closed value set for every preference field. */
  const allowed = Object.freeze({
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
  })
  /** @lang zh-CN 产品壳自身的最小双语词典；owner 全量 locale 治理由 W-P125 承担。 @lang en Minimal bilingual dictionary for this product shell; W-P125 owns full owner-locale adoption. */
  const messages = Object.freeze(
    JSON.parse(document.querySelector('[data-hia-public-messages]').textContent)
  )

  // <lang><zh-CN>产品壳的两份 bundle 必须保持 exact key parity；缺项时在交互绑定前 fail closed。</zh-CN><en>The two product-shell bundles must retain exact key parity and fail closed before interaction binding when an entry is missing.</en></lang>
  const chineseMessageIds = Object.keys(messages['zh-CN']).sort()
  const englishMessageIds = Object.keys(messages.en).sort()
  if (chineseMessageIds.join() !== englishMessageIds.join()) {
    throw new Error('BP product UI locale bundles are incomplete.')
  }

  /** @lang zh-CN 根元素承载所有无脚本可忽略的显示状态。 @lang en Root element carries all display state that can be ignored without scripts. */
  const root = document.documentElement
  /** @lang zh-CN Portal UI locale 控件是产品 chrome 的唯一语言事实源；正文 locale 保持独立。 @lang en The Portal UI-locale control is the sole language source for product chrome; content locale remains independent. */
  const uiLocaleControl = document.querySelector('[data-hia-ui-locale-control]')
  /** @lang zh-CN 产品设置对话框使用原生 dialog 语义。 @lang en Product settings use native dialog semantics. */
  const settingsDialog = document.querySelector('[data-hia-settings-dialog]')
  /** @lang zh-CN 产品搜索对话框保持确认稿的焦点约束与 Escape 行为。 @lang en The product search dialog preserves the confirmed focus containment and Escape behavior. */
  const searchDialog = document.querySelector('[data-hia-search-dialog]')
  /** @lang zh-CN searchInput 只过滤三个由构建器绑定的稳定公开入口。 @lang en SearchInput filters only the three stable public entries bound by the builder. */
  const searchInput = searchDialog?.querySelector('[data-hia-search-input]')
  /** @lang zh-CN searchResults 是无需额外网络或源码索引的有界结果集。 @lang en SearchResults are a bounded result set requiring no extra network or source index. */
  const searchResults = [
    ...(searchDialog?.querySelectorAll('[data-hia-search-result]') || [])
  ]
  /** @lang zh-CN searchEmpty 为过滤零结果提供可读反馈。 @lang en SearchEmpty provides readable feedback when filtering returns zero results. */
  const searchEmpty = searchDialog?.querySelector('[data-hia-search-empty]')
  /** @lang zh-CN 主内容 host 会被 Portal 在选择节点时整体替换。 @lang en The Portal replaces the main content host when selecting a node. */
  const contentHost = document.querySelector('[data-hia-project-content]')
  /** @lang zh-CN 原导航树 host 是桌面与移动导航的同一事实源。 @lang en The original navigation-tree host is the shared fact source for desktop and mobile navigation. */
  const treeHost = document.querySelector('[data-hia-project-tree]')
  /** @lang zh-CN 移动导航 host 只保存原树的非权威投影。 @lang en The mobile-navigation host stores only a non-authoritative projection of the original tree. */
  const mobileNavigationHost = document.querySelector(
    '[data-hia-public-mobile-navigation-host]'
  )
  /** @lang zh-CN 桌面 outline 的列表 host。 @lang en List host for the desktop outline. */
  const outlineHost = document.querySelector('[data-hia-public-outline-list]')
  /** @lang zh-CN 移动 outline 的列表 host。 @lang en List host for the mobile outline. */
  const mobileOutlineHost = document.querySelector(
    '[data-hia-public-mobile-outline-list]'
  )
  /** @lang zh-CN 复用同一个移动目录disclosure，在每个实际页首之后定位，保留监听器与展开状态。 @lang en Reuse one mobile outline disclosure after each actual page heading, retaining listeners and expansion state. */
  const mobileOutline = mobileOutlineHost?.closest('details')
  /** @lang zh-CN breadcrumb 当前节点标签。 @lang en Current-node label in the breadcrumb. */
  const breadcrumbCurrent = document.querySelector(
    '[data-hia-public-breadcrumb-current]'
  )
  /** @lang zh-CN 设置保存状态使用 polite live region。 @lang en Settings status uses a polite live region. */
  const settingsStatus = document.querySelector('[data-hia-settings-status]')
  /** @lang zh-CN 每个复制按钮只保留一个短期反馈计时器，重复激活先取消旧反馈。 @lang en Each copy button retains only one short-lived feedback timer, cancelling old feedback on repeated activation. */
  const copyFeedbackTimers = new WeakMap()

  /**
   * @lang zh-CN 在读者激活复制按钮时写入对应公开代码的精确原文，拒绝或缺少API时只反馈失败。
   * @lang en Writes the exact corresponding public code on reader activation, reporting failure when denied or unavailable.
   * @param {MouseEvent} event <lang><zh-CN>原生按钮点击，包含键盘激活。</zh-CN><en>Native button click, including keyboard activation.</en></lang>
   * @returns {Promise<void>} <lang><zh-CN>反馈使用当前界面语言，始终保留现有焦点和可选正文。</zh-CN><en>Feedback uses the current interface language and retains focus and selectable code.</en></lang>
   * @sideEffects <lang><zh-CN>仅由用户动作写系统剪贴板，不读取剪贴板，不创建隐藏编辑器。</zh-CN><en>Writes the system clipboard only on user action, without reading it or creating a hidden editor.</en></lang>
   */
  async function copyPublicCode(event) {
    if (!event.isTrusted || !(event.target instanceof Element)) return
    /** @lang zh-CN 委托允许异步到达的API正文使用同一路径，不重复绑定监听器。 @lang en Delegation lets asynchronously loaded API content share one path without duplicate listeners. */
    const button = event.target.closest('button[data-hia-public-copy]')
    if (!button || button.hasAttribute('aria-busy')) return
    /** @lang zh-CN 目标必须是该按钮本地代码块内的code节点，不能将其它页面文本当成复制来源。 @lang en The target must be a code node inside this button's own code block, excluding unrelated page text. */
    const code = document.getElementById(button.dataset.hiaPublicCopy)
    if (
      !code?.matches('code') ||
      !button.closest('.hia-public-code')?.contains(code)
    )
      return
    clearTimeout(copyFeedbackTimers.get(button))
    button.setAttribute('aria-busy', 'true')
    /** @lang zh-CN 结果只选择双语字典中的固定反馈，不显示平台异常或敏感内容。 @lang en The outcome selects fixed bilingual feedback and exposes no platform errors or sensitive content. */
    let outcome = 'copied'
    try {
      await navigator.clipboard.writeText(code.textContent)
    } catch {
      outcome = 'copyFailed'
    } finally {
      button.removeAttribute('aria-busy')
    }
    button.dataset.hiaPublicI18n = outcome
    button.textContent = translate(outcome)
    copyFeedbackTimers.set(
      button,
      setTimeout(() => {
        button.dataset.hiaPublicI18n = 'copy'
        button.textContent = translate('copy')
        copyFeedbackTimers.delete(button)
      }, 1200)
    )
  }
  document.addEventListener('click', copyPublicCode)

  /**
   * <lang><zh-CN>从设备存储读取并按 closed sets 清洗偏好。</zh-CN><en>Reads preferences from device storage and sanitizes them against closed sets.</en></lang>
   *
   * @returns {Object} <lang><zh-CN>完整、有效的偏好对象。</zh-CN><en>Complete validated preference object.</en></lang>
   */
  function readPreferences() {
    /** @lang zh-CN parsed 只在成功解析普通对象后使用。 @lang en Parsed is used only after a plain object is parsed successfully. */
    let parsed
    try {
      parsed = JSON.parse(localStorage.getItem(storageKey) || '{}')
    } catch {
      parsed = {}
    }
    /** @lang zh-CN result 从确认稿默认值开始，未知值不能进入 data attributes。 @lang en Result begins with confirmed defaults so unknown values cannot enter data attributes. */
    const result = { ...defaults }
    for (const [field, values] of Object.entries(allowed)) {
      if (values.includes(parsed?.[field])) result[field] = parsed[field]
    }
    return result
  }

  /**
   * <lang><zh-CN>把非个人显示偏好持久化到当前设备；存储失败不阻断阅读。</zh-CN><en>Persists non-personal display preferences on this device; storage failure never blocks reading.</en></lang>
   *
   * @param {Object} preferences <lang><zh-CN>已验证偏好。</zh-CN><en>Validated preferences.</en></lang>
   * @returns {void}
   */
  function writePreferences(preferences) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences))
      if (settingsStatus) settingsStatus.textContent = translate('saved')
    } catch {
      if (settingsStatus) settingsStatus.textContent = ''
    }
  }

  /**
   * <lang><zh-CN>读取当前产品壳 locale。</zh-CN><en>Reads the current product-shell locale.</en></lang>
   *
   * @returns {'zh-CN'|'en'} <lang><zh-CN>受支持 locale。</zh-CN><en>Supported locale.</en></lang>
   */
  function currentLocale() {
    return uiLocaleControl?.value === 'en' || root.lang === 'en'
      ? 'en'
      : 'zh-CN'
  }

  /**
   * <lang><zh-CN>解析产品壳词条。</zh-CN><en>Resolves a product-shell message.</en></lang>
   *
   * @param {string} key <lang><zh-CN>词条 key。</zh-CN><en>Message key.</en></lang>
   * @returns {string} <lang><zh-CN>当前 locale 文本。</zh-CN><en>Text for the current locale.</en></lang>
   */
  function translate(key) {
    return messages[currentLocale()][key] || key
  }

  /**
   * <lang><zh-CN>只翻译 BP 产品壳，避免冒充已完成 owner 全量 locale 治理。</zh-CN><en>Translates only the BP product shell so it does not pretend owner-wide locale adoption is complete.</en></lang>
   *
   * @returns {void}
   */
  function applyProductLocale() {
    // <lang><zh-CN>显式语言首页随既有EN切换同步地址及普通回链，保留query、条目hash和历史状态。</zh-CN><en>Synchronize explicit locale landings and ordinary return links with the existing language switch, retaining query, entry hash, and history state.</en></lang>
    if (root.dataset.hiaPublicRouteLocale) {
      const locale = currentLocale()
      root.dataset.hiaPublicRouteLocale = locale
      for (const link of document.querySelectorAll(
        'a[href="index.en.html"],a[href="index.zh-CN.html"]'
      ))
        link.setAttribute('href', `index.${locale}.html`)
      for (const link of document.querySelectorAll(
        'a[href="pages/en/index.html"],a[href="pages/zh-CN/index.html"]'
      ))
        link.setAttribute('href', `pages/${locale}/index.html`)
      const address = new URL(window.location.href)
      const pathname = address.pathname.replace(
        /index\.(?:en|zh-CN)\.html$/u,
        `index.${locale}.html`
      )
      if (pathname !== address.pathname) {
        address.pathname = pathname
        try {
          window.history.replaceState(window.history.state, '', address)
        } catch {}
      }
    }
    for (const element of document.querySelectorAll('[data-hia-public-i18n]')) {
      /** @lang zh-CN 只写变化的词条，异步正文观察器可以安全复用翻译过程。 @lang en Write only changed messages so the asynchronous content observer can safely reuse localization. */
      const message = translate(element.dataset.hiaPublicI18n)
      if (element.textContent !== message) element.textContent = message
    }
    for (const element of document.querySelectorAll(
      '[data-hia-public-i18n-placeholder]'
    )) {
      element.setAttribute(
        'placeholder',
        translate(element.dataset.hiaPublicI18nPlaceholder)
      )
    }
    for (const element of document.querySelectorAll(
      '[data-hia-public-i18n-aria]'
    )) {
      element.setAttribute(
        'aria-label',
        translate(element.dataset.hiaPublicI18nAria)
      )
    }
    /** @lang zh-CN locale button 文本表示下一次切换目标。 @lang en The locale-button text represents the next switch target. */
    const localeButton = document.querySelector('[data-hia-public-locale]')
    if (localeButton) {
      localeButton.textContent = currentLocale() === 'en' ? '中' : 'EN'
      localeButton.dataset.hiaPublicI18nAria =
        currentLocale() === 'en' ? 'switchToChinese' : 'switchToEnglish'
      localeButton.setAttribute(
        'aria-label',
        translate(localeButton.dataset.hiaPublicI18nAria)
      )
    }
    /** @lang zh-CN 窄屏图标按钮仍需具备随 locale 更新的可访问名称。 @lang en The narrow-screen icon button still requires an accessible name updated with the locale. */
    document
      .querySelector('.hia-public-mobile-search')
      ?.setAttribute('aria-label', translate('search'))
    decorateTree()
  }

  /**
   * <lang><zh-CN>应用偏好并同步对话框控件，不触发外部请求。</zh-CN><en>Applies preferences and synchronizes dialog controls without external requests.</en></lang>
   *
   * @param {Object} preferences <lang><zh-CN>完整偏好。</zh-CN><en>Complete preferences.</en></lang>
   * @param {boolean} persist <lang><zh-CN>是否保存到设备。</zh-CN><en>Whether to store on the device.</en></lang>
   * @returns {void}
   */
  function applyPreferences(preferences, persist) {
    root.dataset.hiaScheme = preferences.siteTheme
    root.dataset.hiaCodeTheme = preferences.codeTheme
    root.dataset.hiaCodeFontSize = preferences.codeFontSize
    root.dataset.hiaCodeWrap = preferences.codeWrap
    root.dataset.hiaCodeLines = preferences.codeLines
    root.dataset.hiaContentWidth = preferences.contentWidth
    root.dataset.hiaApiScope = preferences.apiScope
    root.dataset.hiaShowMetadata = preferences.metadata
    root.dataset.hiaShowContract = preferences.contract
    root.dataset.hiaShowCoverage = preferences.coverage
    root.dataset.hiaShowProvenance = preferences.provenance
    root.dataset.hiaShowRelations = preferences.relations
    /** @lang zh-CN 范围提示跟随实际public/all状态并进入现有语言更新路径。 @lang en The scope hint follows actual public/all state and participates in the existing locale-update path. */
    const scopeLabel = document.querySelector('[data-hia-public-scope-label]')
    if (scopeLabel) {
      scopeLabel.dataset.hiaPublicI18n =
        preferences.apiScope === 'all' ? 'scopeAll' : 'scopePublic'
      scopeLabel.textContent = translate(scopeLabel.dataset.hiaPublicI18n)
    }

    for (const control of document.querySelectorAll('[data-hia-preference]')) {
      /** @lang zh-CN field 由 builder 生成的 closed data attribute 提供。 @lang en Field comes from a closed data attribute generated by the builder. */
      const field = control.dataset.hiaPreference
      if (control.type === 'radio')
        control.checked = control.value === preferences[field]
      else if (control.type === 'checkbox')
        control.checked =
          preferences[field] === (control.dataset.hiaCheckedValue || 'show')
      else control.value = preferences[field]
    }
    /** @lang zh-CN 原 Portal scheme select 同步当前站点主题，保持既有 theme contract 可观察。 @lang en The original Portal scheme select mirrors the site theme so the existing theme contract remains observable. */
    const nativeScheme = document.querySelector('[data-hia-scheme-control]')
    if (nativeScheme) nativeScheme.value = preferences.siteTheme
    if (persist) writePreferences(preferences)
  }

  /**
   * <lang><zh-CN>从对话框读取受 closed sets 约束的新偏好。</zh-CN><en>Reads new preferences constrained by closed sets from the dialog.</en></lang>
   *
   * @returns {Object} <lang><zh-CN>完整偏好。</zh-CN><en>Complete preferences.</en></lang>
   */
  function preferencesFromControls() {
    /** @lang zh-CN next 从当前有效状态复制，避免缺失控件清空字段。 @lang en Next clones the current valid state so missing controls cannot clear fields. */
    const next = readPreferences()
    for (const field of Object.keys(allowed)) {
      /** @lang zh-CN checkbox 使用显式 show/hide 状态，其余字段来自 checked radio 或 select。 @lang en Checkboxes map to explicit show/hide state; other fields come from a checked radio or select. */
      const checkbox = document.querySelector(
        `input[type="checkbox"][data-hia-preference="${field}"]`
      )
      if (checkbox) {
        // <lang><zh-CN>换行复选框映射既有wrap/scroll，显隐和行号继续映射show/hide，所有值仍经过原闭集。</zh-CN><en>The wrapping checkbox maps to existing wrap/scroll values; visibility and line numbers retain show/hide, with every value still checked against the original closed set.</en></lang>
        const value = checkbox.checked
          ? checkbox.dataset.hiaCheckedValue || 'show'
          : checkbox.dataset.hiaUncheckedValue || 'hide'
        if (allowed[field].includes(value)) next[field] = value
        continue
      }
      const control = document.querySelector(
        `[data-hia-preference="${field}"]:checked, select[data-hia-preference="${field}"]`
      )
      if (control && allowed[field].includes(control.value))
        next[field] = control.value
    }
    return next
  }

  /**
   * <lang><zh-CN>读取经过长度约束的当前 entry hash identity。</zh-CN><en>Reads the length-bounded current entry identity from the hash.</en></lang>
   *
   * @returns {string} <lang><zh-CN>目标 identity；无效或 landing 时为空。</zh-CN><en>Target identity, or empty for invalid input or the landing.</en></lang>
   */
  function activeEntryIdentity() {
    if (!location.hash.startsWith('#entry=')) return ''
    try {
      /** @lang zh-CN identity 只用于匹配生成 DOM 的既有 id，不拼接 selector 或 URL。 @lang en Identity is used only to match an existing generated DOM ID and is never concatenated into a selector or URL. */
      const identity = decodeURIComponent(location.hash.slice(7))
      return identity.length > 0 && identity.length <= 512 ? identity : ''
    } catch {
      return ''
    }
  }

  /**
   * <lang><zh-CN>在 owner 的语义容器中只呈现当前选中 article。</zh-CN><en>Shows only the currently selected article within the owner's semantic container.</en></lang>
   *
   * @returns {Element | undefined} <lang><zh-CN>当前 article；landing 或尚未加载时为空。</zh-CN><en>Current article, or undefined on the landing or before loading.</en></lang>
   */
  function projectActiveArticle() {
    if (!contentHost) return undefined
    /** @lang zh-CN activeArticle 通过 DOM id equality 定位，避免含冒号 identity 的 selector escaping 风险。 @lang en ActiveArticle is located by DOM ID equality, avoiding selector-escaping risks for identities containing colons. */
    let activeArticle = document.getElementById(activeEntryIdentity())
    // <lang><zh-CN>本页锚点会取代entry片段，后续复制/源码/展开仍以已显示条目为范围；显式entry请求继续精确匹配身份。</zh-CN><en>A local anchor replaces the entry fragment, so later copy/source/disclosure updates retain the already displayed article; explicit entry requests still require exact identity matching.</en></lang>
    if (!activeArticle && !location.hash.startsWith('#entry=')) {
      activeArticle = [
        ...contentHost.querySelectorAll(':scope > article.hia-project-entry')
      ].find((article) => !article.hidden)
    }
    if (!activeArticle || !contentHost.contains(activeArticle)) return undefined
    /** @lang zh-CN siblings 来自当前 content host 的直接 article，隐藏不会改变 owner fragment 或搜索 identity。 @lang en Siblings are direct articles of the current content host; hiding them changes neither owner fragments nor search identities. */
    const siblings = contentHost.querySelectorAll(
      ':scope > article.hia-project-entry'
    )
    for (const article of siblings) article.hidden = article !== activeArticle
    activeArticle.hidden = false
    return activeArticle
  }

  /**
   * <lang><zh-CN>判断可选 topic section 是否按当前偏好显示。</zh-CN><en>Determines whether an optional topic section is visible under current preferences.</en></lang>
   *
   * @param {Element} candidate <lang><zh-CN>section summary 或 landing heading。</zh-CN><en>Section summary or landing heading.</en></lang>
   * @returns {boolean} <lang><zh-CN>是否应进入可见内容与 outline。</zh-CN><en>Whether the section belongs in visible content and the outline.</en></lang>
   */
  function isContentSectionVisible(candidate) {
    // <lang><zh-CN>确认稿中隐藏的契约分组栏不生成不可见目录目标，实际签名等小节继续进入目录。</zh-CN><en>The contract grouping bar hidden by the confirmed layout creates no invisible outline target; actual signature sections remain listed.</en></lang>
    if (getComputedStyle(candidate).display === 'none') return false
    /** @lang zh-CN section 从稳定 topic attribute 或 landing 父 section 读取。 @lang en Section comes from the stable topic attribute or the landing parent section. */
    const section =
      candidate.closest('[data-hia-topic-section]')?.dataset.hiaTopicSection ||
      candidate.closest('[data-hia-content-section]')?.dataset
        .hiaContentSection ||
      ''
    /** @lang zh-CN details 保留可见 summary；其折叠正文标题不应继续出现在本页 outline。 @lang en Details keeps its summary visible while collapsed body headings leave the page outline. */
    const containingDetails = candidate.closest(
      'details[data-hia-topic-section]'
    )
    if (
      containingDetails &&
      candidate.tagName !== 'SUMMARY' &&
      !containingDetails.open
    ) {
      return false
    }
    if (
      !['metadata', 'contract', 'coverage', 'provenance', 'relations'].includes(
        section
      )
    ) {
      return true
    }
    return (
      root.dataset[`hiaShow${section[0].toUpperCase()}${section.slice(1)}`] ===
      'show'
    )
  }

  /**
   * <lang><zh-CN>为 owner 导航树补充图标类型、计数胶囊和 API scope 标记，不替换其交互节点。</zh-CN><en>Decorates the owner navigation tree with icon kinds, count pills, and API-scope markers without replacing its interactive nodes.</en></lang>
   *
   * @returns {void}
   */
  function decorateTree() {
    if (!treeHost) return
    for (const item of treeHost.querySelectorAll(
      '[data-hia-project-node-id]'
    )) {
      /** @lang zh-CN nodeId 是生成器提供的稳定分类输入，不会作为 HTML 或 selector 执行。 @lang en NodeId is a stable classifier supplied by the generator and is never executed as HTML or a selector. */
      const nodeId = item.dataset.hiaProjectNodeId || ''
      /** @lang zh-CN kind 只控制第一方图标与行样式。 @lang en Kind controls only first-party icon and row styling. */
      let kind = 'entry'
      if (nodeId === 'bp:public-api') kind = 'public-group'
      else if (nodeId === 'bp:internal-api') kind = 'internal-group'
      else if (nodeId.startsWith('view:')) kind = 'view'
      else if (nodeId.includes(':package:') && !nodeId.includes(':entry:'))
        kind = 'package'
      else if (nodeId.includes(':repository:') && !nodeId.includes('|'))
        kind = 'repository'
      else if (nodeId.includes('typedef')) kind = 'type'
      else if (nodeId.includes('function')) kind = 'function'
      else if (nodeId.includes('module')) kind = 'module'
      else if (nodeId.includes('member')) kind = 'member'
      item.dataset.hiaTreeKind = kind
      item.classList.add('hia-public-tree-item')
      item.toggleAttribute(
        'data-hia-api-scope-only',
        nodeId === 'bp:internal-api'
      )
      if (nodeId === 'bp:internal-api') item.dataset.hiaApiScopeOnly = 'all'

      /** @lang zh-CN summaryLabel 是 owner 生成的直接标签 span；只拆分末尾计数，不改变 disclosure/button。 @lang en SummaryLabel is the direct label span generated by the owner; only its trailing count is split, leaving disclosure and buttons intact. */
      const summaryLabel = item.querySelector(
        ':scope > details > summary > span:first-child'
      )
      if (summaryLabel && !summaryLabel.dataset.hiaTreeDecorated) {
        const match = (summaryLabel.textContent || '')
          .trim()
          .match(/^(.*) \((\d+)\)$/u)
        if (match) {
          summaryLabel.textContent = match[1]
          const count = document.createElement('span')
          count.className = 'hia-public-tree-count'
          count.textContent = match[2]
          summaryLabel.after(count)
        }
        summaryLabel.title = summaryLabel.textContent || ''
        summaryLabel.dataset.hiaTreeDecorated = 'true'
      }
      if (
        nodeId === 'bp:public-api' &&
        summaryLabel &&
        summaryLabel.textContent !== translate('publicApiGroup')
      ) {
        summaryLabel.textContent = translate('publicApiGroup')
      }
      if (
        nodeId === 'bp:internal-api' &&
        summaryLabel &&
        summaryLabel.textContent !== translate('internalApiGroup')
      ) {
        summaryLabel.textContent = translate('internalApiGroup')
      }
      /** @lang zh-CN leafLabel 是 owner 保留的原生 button；title 提供窄栏截断后的完整名称。 @lang en LeafLabel is the native button retained from the owner; its title exposes the complete name after narrow-column truncation. */
      const leafLabel = item.querySelector(':scope > .hia-project-entry-link')
      if (leafLabel) leafLabel.title = leafLabel.textContent || ''
      /** @lang zh-CN 默认展开 package 与公开 API 两个读者层级；内部实现仍保持折叠并受 API scope 控制。</zh-CN><en>Open the package and public-API reader levels by default while keeping internal implementation collapsed and governed by API scope.</en></lang> */
      const disclosure = item.querySelector(':scope > details')
      if (
        disclosure &&
        (kind === 'package' || kind === 'public-group') &&
        !disclosure.open
      ) {
        disclosure.open = true
      }
    }
    ensureOverviewTreeItem()
  }

  /**
   * <lang><zh-CN>在读者树根加入可返回 Portal 首页的概览节点；仅当压平后的 package 根存在时生成。</zh-CN><en>Adds a reader-facing overview link back to the Portal landing page, only when the flattened package root is present.</en></lang>
   *
   * @returns {void}
   */
  function ensureOverviewTreeItem() {
    if (!treeHost) return
    /** @lang zh-CN rootList 必须是权威树的直接列表，搜索结果列表不会包含 package 根，因此不会误插概览。 @lang en rootList must be the authoritative direct tree list; search results contain no package root and therefore receive no accidental overview item. */
    const rootList = treeHost.querySelector(
      ':scope > .hia-project-hierarchy-list'
    )
    if (
      !rootList?.querySelector(':scope > [data-hia-tree-kind="package"]') ||
      rootList.querySelector(':scope > [data-hia-public-overview-item]')
    ) {
      return
    }
    /** @lang zh-CN item 只承载当前文档站内的静态首页链接，不复制 owner entry identity。 @lang en Item carries only a static same-site landing link and does not fabricate an owner entry identity. */
    const item = document.createElement('li')
    item.className = 'hia-public-tree-item'
    item.dataset.hiaTreeKind = 'overview'
    item.dataset.hiaPublicOverviewItem = 'true'
    /** @lang zh-CN link 复用 brand 的相对首页地址，以兼容 GitHub Pages 子路径部署。 @lang en Link reuses the brand's relative landing address to remain compatible with a GitHub Pages subpath deployment. */
    const link = document.createElement('a')
    link.className = 'hia-project-entry-link hia-public-overview-link'
    link.href =
      document.querySelector('.hia-public-brand')?.getAttribute('href') || './'
    link.dataset.hiaPublicI18n = 'overview'
    link.textContent = translate('overview')
    link.title = link.textContent
    if (!activeEntryIdentity()) link.setAttribute('aria-current', 'page')
    item.append(link)
    rootList.prepend(item)
  }

  /**
   * <lang><zh-CN>仅对已经过 owner 字节数和 SHA-384 校验的 fetch 源码执行本地 Prism 高亮。</zh-CN><en>Runs local Prism highlighting only for fetched source already verified by the owner for byte length and SHA-384.</en></lang>
   *
   * @param {ParentNode | null} scope <lang><zh-CN>受限 DOM 范围。</zh-CN><en>Bounded DOM scope.</en></lang>
   * @returns {void}
   */
  function highlightVerifiedSources(scope = contentHost) {
    if (!scope) return
    for (const details of scope.querySelectorAll(
      'details[data-hia-source-fetch]'
    )) {
      /** @lang zh-CN 原生源码节点仅在owner校验通过后进入高亮流程。 @lang en Native source nodes enter highlighting only after owner verification. */
      const code = details.querySelector('code')
      if (!code) continue
      if (details.dataset.hiaSourceState !== 'ready') {
        delete code.dataset.hiaPrismIntegrity
        continue
      }
      /** @lang zh-CN 已验证摘要限定一次高亮，重置会清除此标记。 @lang en The verified digest bounds highlighting to one pass, with reset clearing this marker. */
      const integrity = details.dataset.hiaSourceIntegrity || ''
      if (code.dataset.hiaPrismIntegrity === integrity) continue
      /** @lang zh-CN 原生行保留真实起始行与同源锚点，标签不参与源码分词。 @lang en Native rows retain original positions and same-origin anchors, with labels excluded from tokenization. */
      const rows = [...code.querySelectorAll(':scope > .hia-source-code-line')]
      if (!rows.length || !globalThis.Prism?.tokenize) continue
      /** @lang zh-CN 每行的原始正文排除既有行号列，换行按owner的行模型连接。 @lang en Original row content excludes the existing gutter and joins with the owner's line-model separators. */
      const sourceLines = rows.map((row) =>
        [...row.childNodes]
          .filter(
            (node) => node !== row.querySelector('.hia-source-line-number')
          )
          .map((node) => node.textContent)
          .join('')
      )
      /** @lang zh-CN 完整文本一次分词，保留跨行注释、字符串及模板字面量的语义。 @lang en Tokenize complete text once to retain multiline comment, string, and template-literal semantics. */
      const text = sourceLines.join('\n')
      /** @lang zh-CN 未挂载的正文列在全部保真检查通过后才替换可见文本。 @lang en Detached content columns replace visible text only after every fidelity check passes. */
      const columns = rows.map(() => {
        const column = document.createElement('span')
        column.className = 'hia-public-source-line-content'
        return column
      })
      /** @lang zh-CN 当前投影行索引从零开始，只随原文换行前进。 @lang en The zero-based projection index advances only on original newlines. */
      let lineIndex = 0
      /**
       * @lang zh-CN 将Prism递归令牌投影到原生行，只为令牌实际跨越的行创建span。
       * @lang en Project recursive Prism tokens onto native rows, creating spans only on lines actually touched by each token.
       * @param {string | Object | Array} value <lang><zh-CN>固定Prism语法产生的令牌或文本。</zh-CN><en>Token or text produced by the pinned Prism grammar.</en></lang>
       * @param {(line: number) => Node} parent <lang><zh-CN>当前令牌所在行的父节点。</zh-CN><en>Parent node for the current token on a given line.</en></lang>
       * @returns {void}
       */
      function appendToken(value, parent) {
        if (typeof value === 'string') {
          // <lang><zh-CN>空片段仍推进空行，原始文字只通过Text节点进入DOM。</zh-CN><en>Empty fragments still advance blank lines, and original text enters the DOM only as Text nodes.</en></lang>
          value.split('\n').forEach((part, index) => {
            if (index) lineIndex += 1
            if (part) parent(lineIndex).append(document.createTextNode(part))
          })
          return
        }
        if (Array.isArray(value)) {
          for (const token of value) appendToken(token, parent)
          return
        }
        /** @lang zh-CN 每个语法令牌按实际触及行缓存其包裹节点，避免行数乘令牌数的空DOM。 @lang en Cache each token wrapper only on touched lines, avoiding empty DOM proportional to lines times tokens. */
        const wrappers = new Map()
        appendToken(value.content, (line) => {
          if (!wrappers.has(line)) {
            const span = document.createElement('span')
            span.classList.add('token', value.type)
            if (value.alias) span.classList.add(...[value.alias].flat())
            parent(line).append(span)
            wrappers.set(line, span)
          }
          return wrappers.get(line)
        })
      }
      try {
        appendToken(
          globalThis.Prism.tokenize(
            text,
            globalThis.Prism.languages.javascript
          ),
          (line) => columns[line]
        )
        if (
          lineIndex !== rows.length - 1 ||
          columns.map((column) => column.textContent).join('\n') !== text
        ) {
          throw new Error('Verified source token projection changed text.')
        }
        // <lang><zh-CN>标记先于DOM修改，观察器重入时复用同一次投影；原生行号链接保持在原位置。</zh-CN><en>Mark before DOM mutation so observer reentry reuses this projection, while native line links remain in place.</en></lang>
        code.dataset.hiaPrismIntegrity = integrity
        rows.forEach((row, index) => {
          const label = row.querySelector('.hia-source-line-number')
          for (const node of [...row.childNodes])
            if (node !== label) node.remove()
          row.append(columns[index])
        })
      } catch {
        // <lang><zh-CN>分词或保真失败保留既有校验文本及行号，不改变来源状态。</zh-CN><en>Tokenization or fidelity failure retains existing verified text and line numbers without changing source state.</en></lang>
        delete code.dataset.hiaPrismIntegrity
      }
    }
  }

  /**
   * <lang><zh-CN>高亮构建期可信的设置预览；它不是 fetch 源码，也不参与源码完整性状态。</zh-CN><en>Highlights the build-trusted settings preview; it is not fetched source and does not participate in source-integrity state.</en></lang>
   *
   * @returns {void}
   */
  function highlightSettingsPreview() {
    const preview = document.querySelector('.hia-public-settings-preview code')
    if (!preview || !globalThis.Prism?.highlightElement) return
    try {
      globalThis.Prism.highlightElement(preview)
    } catch {
      // <lang><zh-CN>预览高亮同样保持无错误的纯文本降级。</zh-CN><en>The preview likewise retains an error-free plain-text fallback.</en></lang>
    }
  }

  /**
   * <lang><zh-CN>在启用脚本后把精选 API 链接绑定到 owner deep-link，并保留静态 fallback 供无脚本访问。</zh-CN><en>After scripts initialize, binds featured API links to owner deep links while retaining static fallbacks for no-script access.</en></lang>
   *
   * @returns {void} <lang><zh-CN>更新链接 href 并安装一次性委托点击处理。</zh-CN><en>Updates link hrefs and installs one delegated click handler.</en></lang>
   * @sideEffects <lang><zh-CN>改写本页精选链接并在普通左键激活时创建本地 history entry。</zh-CN><en>Rewrites featured links on this page and creates a local history entry on an ordinary primary-button activation.</en></sideEffects>
   */
  function bindPublicEntryLinks() {
    /** @lang zh-CN publicEntryLinks 是由 build-time owner manifest 标记的公开 API 链接。 @lang en PublicEntryLinks are public API anchors marked from the build-time owner manifest. */
    const publicEntryLinks = document.querySelectorAll(
      'a[data-hia-public-entry]'
    )
    for (const link of publicEntryLinks) {
      /** @lang zh-CN entryIdentity 必须遵循 owner entry id 字符集，拒绝不安全 identity。 @lang en EntryIdentity must follow the owner entry-ID character set; unsafe identities are rejected. */
      const entryIdentity = link.dataset.hiaPublicEntry
      if (!/^jsdoc-integration:[A-Za-z0-9._:-]+$/u.test(entryIdentity || '')) {
        continue
      }
      /** @lang zh-CN portalUrl 固定定位到当前站点根目录的 Portal 入口。 @lang en PortalUrl always targets the Portal entry at the current site's root. */
      const portalUrl = new URL('./', document.baseURI)
      portalUrl.hash = `entry=${encodeURIComponent(entryIdentity)}`
      link.href = portalUrl.href
    }

    document.addEventListener('click', (event) => {
      // <lang><zh-CN>保留修饰键、新标签页、下载和非主键操作的浏览器原生链接行为。</zh-CN><en>Preserve native link behavior for modifier keys, new tabs, downloads, and non-primary-button activations.</en></lang>
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      /** @lang zh-CN eventTargetAnchor 只接受同页 API entry anchor。 @lang en EventTargetAnchor accepts only same-page API-entry anchors. */
      const eventTarget = event.target
      if (!(eventTarget instanceof Element)) return
      const eventTargetAnchor = eventTarget.closest('a[data-hia-public-entry]')
      if (
        !eventTargetAnchor ||
        (eventTargetAnchor.target && eventTargetAnchor.target !== '_self') ||
        eventTargetAnchor.hasAttribute('download')
      ) {
        return
      }

      /** @lang zh-CN entryIdentity 再次校验，避免动态 DOM 修改将任意值送入 Portal hash。 @lang en EntryIdentity is checked again so dynamic DOM changes cannot inject arbitrary values into the Portal hash. */
      const entryIdentity = eventTargetAnchor.dataset.hiaPublicEntry
      if (!/^jsdoc-integration:[A-Za-z0-9._:-]+$/u.test(entryIdentity || '')) {
        return
      }
      event.preventDefault()
      /** @lang zh-CN portalUrl 从站点入口与公开 identity 重建，避免动态 href 值越过路由边界。 @lang en PortalUrl is rebuilt from the site entry and public identity so a dynamic href cannot cross the route boundary. */
      const portalUrl = new URL('./', document.baseURI)
      portalUrl.hash = `entry=${encodeURIComponent(entryIdentity)}`
      // <lang><zh-CN>标记离开的真实首页历史项，原生返回时才能恢复被owner替换的首页DOM；保留既有state字段与首页锚点。</zh-CN><en>Mark the actual landing-history entry so native back can restore landing DOM replaced by the owner, preserving existing state fields and landing anchors.</en></lang>
      if (contentHost?.querySelector('.hia-public-landing')) {
        window.history.replaceState(
          { ...window.history.state, hiaPublicLanding: true },
          '',
          window.location.href
        )
      }
      window.history.pushState({ hiaPublicEntry: entryIdentity }, '', portalUrl)
      window.location.reload()
    })
  }

  /**
   * <lang><zh-CN>从当前 topic 的真实节点生成桌面与移动 outline。</zh-CN><en>Builds desktop and mobile outlines from real nodes in the current topic.</en></lang>
   *
   * @returns {void}
   */
  function rebuildOutline() {
    if (!contentHost || !outlineHost || !mobileOutlineHost) return
    /** @lang zh-CN topicScope 优先使用当前 identity 对应的 article，避免把同容器 sibling 混入页面 outline。 @lang en TopicScope prefers the article matching the current identity so sibling entries in the same container cannot leak into the page outline. */
    const topicScope = projectActiveArticle()
    /** @lang zh-CN 页首由当前真实article决定；移动目录在标题/导语后、正文小节前。 @lang en The actual current article determines the page heading; the mobile outline follows its title/lead and precedes body sections. */
    const pageHeading = (topicScope || contentHost).querySelector(
      '.hia-public-api-heading, .hia-project-topic-header, .hia-public-hero'
    )
    if (
      mobileOutline &&
      pageHeading &&
      pageHeading.nextElementSibling !== mobileOutline
    ) {
      pageHeading.after(mobileOutline)
    }
    /** @lang zh-CN 单次查询保留真实正文顺序，仅纳入owner小节与契约标题，移动目录自身不成为目录项。 @lang en One query retains actual document order and includes only owner sections and contract headings, excluding the mobile outline itself. */
    const candidates = (
      topicScope
        ? [
            ...topicScope.querySelectorAll(
              ':scope > details[data-hia-topic-section] > summary, :scope > details[data-hia-topic-section="contract"] :is(h2,h3)[id]'
            )
          ]
        : [
            ...contentHost.querySelectorAll(
              ':scope > article > details[data-hia-topic-section] > summary, :scope > article h2[id]'
            )
          ]
    ).filter(isContentSectionVisible)
    /** @lang zh-CN list 是两个 outline host 共用的临时无序列表。 @lang en List is the temporary unordered list shared by both outline hosts. */
    const list = document.createElement('ul')
    list.className = 'hia-public-outline-list'
    candidates.slice(0, 12).forEach((candidate, index) => {
      /** @lang zh-CN target 是 summary 的 details 或已有标题节点。 @lang en Target is the summary's details element or an existing heading node. */
      const target =
        candidate.tagName === 'SUMMARY' ? candidate.parentElement : candidate
      if (!target) return
      if (!target.id) target.id = `hia-public-section-${index + 1}`
      /** @lang zh-CN item/link 仅引用本页 fragment，不建立额外网络 route。 @lang en Item and link reference only a same-page fragment and create no extra network route. */
      const item = document.createElement('li')
      const link = document.createElement('a')
      link.href = `#${encodeURIComponent(target.id)}`
      // <lang><zh-CN>outlineLabel 使用渲染后可见文本，避免把 hidden locale 的另一种语言拼进目录。</zh-CN><en>OutlineLabel uses rendered visible text so a hidden alternate locale is not concatenated into the outline.</en></lang>
      const outlineLabel =
        candidate.innerText?.trim() || candidate.textContent?.trim()
      link.textContent = outlineLabel || `Section ${index + 1}`
      item.append(link)
      list.append(item)
    })
    // <lang><zh-CN>源码和复制反馈会触发观察器，目录内容相同时保留原节点及其真实焦点。</zh-CN><en>Source and copy feedback trigger the observer; identical outline content retains its original nodes and actual focus.</en></lang>
    if (!outlineHost.firstElementChild?.isEqualNode(list)) {
      outlineHost.replaceChildren(list)
    }
    if (!mobileOutlineHost.firstElementChild?.isEqualNode(list)) {
      mobileOutlineHost.replaceChildren(list.cloneNode(true))
    }

    /** @lang zh-CN 当前 label 只取可见 topic heading，不读取 search index 或源码正文。 @lang en Current label uses only the visible topic heading and reads neither the search index nor source bodies. */
    const heading = (topicScope || contentHost).querySelector('h1, h2')
    if (breadcrumbCurrent) {
      /** @lang zh-CN 首页使用固定概览标签，API页显示实际标题中的调用名。 @lang en The landing uses the fixed overview label; API pages show the invocation name from the actual heading. */
      let label = translate('breadcrumb')
      if (topicScope && heading) {
        label = heading.textContent.trim() || label
        if (topicScope.hasAttribute('data-hia-public-api-topic'))
          label = label.replace(/^Cookies\./u, '')
      }
      breadcrumbCurrent.textContent = label
    }
    /** @lang zh-CN API参考中间层仅用于已登记API页，首页和其它文档仍由原面包屑表示。 @lang en The API-reference breadcrumb level applies only to registered API pages; the original breadcrumb represents landing and other documents. */
    const apiBreadcrumb = document.querySelector(
      '[data-hia-public-api-breadcrumb]'
    )
    if (apiBreadcrumb)
      apiBreadcrumb.hidden = !topicScope?.hasAttribute(
        'data-hia-public-api-topic'
      )
  }

  /**
   * @lang zh-CN 由稳定目录容器接管锚点焦点，移动克隆与桌面共享同一路径。
   * @lang en Stable outline containers own anchor focus, sharing the same path across desktop and mobile clones.
   * @param {MouseEvent} event <lang><zh-CN>真实链接激活事件。</zh-CN><en>Actual link activation event.</en></lang>
   * @returns {void}
   */
  function focusOutlineTarget(event) {
    /** @lang zh-CN 链接只定位当前正文中的既有片段。 @lang en Links address only existing fragments in current content. */
    const link = event.target.closest('a[href^="#"]')
    if (!link) return
    const target = document.getElementById(
      decodeURIComponent(link.hash.slice(1))
    )
    if (!target || !contentHost?.contains(target)) return
    // <lang><zh-CN>先展开祖先disclosure，再聚焦标题或自然summary，保留details自身的键盘范围。</zh-CN><en>Open ancestor disclosures before focusing a heading or native summary, retaining the details keyboard scope.</en></lang>
    for (
      let ancestor = target.closest('details');
      ancestor;
      ancestor = ancestor.parentElement?.closest('details')
    )
      ancestor.open = true
    const focusTarget = target.matches('details')
      ? target.querySelector(':scope > summary')
      : target
    if (!focusTarget) return
    if (!focusTarget.matches('summary')) focusTarget.tabIndex = -1
    focusTarget.focus()
  }
  outlineHost?.addEventListener('click', focusOutlineTarget)
  mobileOutlineHost?.addEventListener('click', focusOutlineTarget)

  /** @lang zh-CN 只保存当前移动选择的焦点归属和稳定条目身份。 @lang en Retain only focus ownership and stable identity for the current mobile selection. */
  let pendingMobileFocus = null

  /** @lang zh-CN 正文到达后恢复本次选择的阅读焦点，读者主动移焦后保留其选择。 @lang en Restore reading focus when selected content arrives, retaining any focus deliberately moved by the reader. */
  function restoreMobileReadingFocus() {
    if (!pendingMobileFocus) return
    const article = [...contentHost.querySelectorAll('article[id]')].find(
      (node) => node.id === pendingMobileFocus.entryId
    )
    if (!article) return
    if (document.activeElement === pendingMobileFocus.owner) {
      const heading = article.querySelector('h1, h2')
      if (heading) {
        heading.tabIndex = -1
        heading.focus()
        heading.scrollIntoView({ block: 'start' })
      }
    }
    pendingMobileFocus = null
  }

  document
    .querySelector('.hia-public-breadcrumb')
    ?.addEventListener('focusin', (event) => {
      /** @lang zh-CN 原生Tab滚动可能让链接停在固定顶部之后，只在实际被遮挡时揭示焦点。 @lang en Native Tab scrolling may leave the link behind the fixed header; reveal focus only when actually occluded. */
      const target = event.target
      const header = document.querySelector('.hia-public-header')
      if (
        target.matches('a') &&
        target.getBoundingClientRect().top <
          header.getBoundingClientRect().bottom
      )
        target.scrollIntoView({ block: 'start' })
    })

  /**
   * <lang><zh-CN>把已加载的权威树投影到窄屏原生 disclosure。</zh-CN><en>Projects the loaded authoritative tree into the narrow-screen native disclosure.</en></lang>
   *
   * @returns {void}
   */
  function rebuildMobileNavigation() {
    if (!treeHost || !mobileNavigationHost) return
    mobileNavigationHost.replaceChildren(
      ...[...treeHost.children].map((node) => node.cloneNode(true))
    )
  }

  /**
   * <lang><zh-CN>按当前输入过滤构建期绑定的公开搜索入口。</zh-CN><en>Filters the build-bound public search entries using the current input.</en></lang>
   *
   * @returns {void}
   */
  function filterSearchResults() {
    if (!searchInput) return
    /** @lang zh-CN query 使用当前 locale 进行大小写归一化，但不写入 URL、存储或遥测。 @lang en Query uses the current locale for case normalization but is written to no URL, storage, or telemetry. */
    const query = searchInput.value.trim().toLocaleLowerCase(currentLocale())
    /** @lang zh-CN visibleCount 决定空结果提示，生命周期仅限当前过滤操作。 @lang en VisibleCount controls the empty-result message and lives only for the current filter operation. */
    let visibleCount = 0
    for (const result of searchResults) {
      const visible =
        query.length === 0 ||
        (result.textContent || '')
          .toLocaleLowerCase(currentLocale())
          .includes(query)
      result.hidden = !visible
      if (visible) visibleCount += 1
    }
    if (searchEmpty) searchEmpty.hidden = visibleCount !== 0
  }

  /**
   * <lang><zh-CN>打开原生搜索 dialog、重置过滤并把焦点交给 searchbox。</zh-CN><en>Opens the native search dialog, resets filtering, and transfers focus to the searchbox.</en></lang>
   *
   * @returns {void}
   */
  function openSearchDialog() {
    if (!(searchDialog instanceof HTMLDialogElement) || !searchInput) return
    searchInput.value = ''
    filterSearchResults()
    if (!searchDialog.open) searchDialog.showModal()
    window.setTimeout(() => searchInput.focus(), 0)
  }

  /**
   * <lang><zh-CN>冷启动 deep link 未被 owner runtime 消费时，通过原导航事件有界展开并打开目标。</zh-CN><en>When the owner runtime does not consume a cold-start deep link, boundedly expands the original navigation and opens the target through its own event.</en></lang>
   *
   * @returns {Promise<boolean>} <lang><zh-CN>是否找到或已呈现目标。</zh-CN><en>Whether the target was found or was already presented.</en></lang>
   */
  async function restoreDeepLink() {
    const identity = activeEntryIdentity()
    if (!identity || !treeHost || !contentHost) return false
    if (projectActiveArticle()) {
      rebuildOutline()
      return true
    }
    /** @lang zh-CN deadline 给远端冷缓存下的 lazy navigation shards 最多十秒，同时保持恢复过程有界。 @lang en Deadline gives lazy navigation shards at most ten seconds under a remote cold cache while keeping recovery bounded. */
    const deadline = performance.now() + 10000
    while (performance.now() < deadline) {
      // <lang><zh-CN>用户或 owner 已改变 hash 时立即放弃旧目标，避免迟到的 shard 打开错误条目。</zh-CN><en>Abandon the stale target immediately when the user or owner changes the hash, preventing a late shard from opening the wrong entry.</en></lang>
      if (activeEntryIdentity() !== identity) return false
      if (projectActiveArticle()) {
        rebuildOutline()
        return true
      }
      /** @lang zh-CN item 通过稳定 entry identity 在权威树中定位。 @lang en Item is located in the authoritative tree by stable entry identity. */
      const item = [
        ...treeHost.querySelectorAll('[data-hia-project-entry-id]')
      ].find((candidate) => candidate.dataset.hiaProjectEntryId === identity)
      /** @lang zh-CN button 保留 owner 绑定的 loadEntry/source/privacy 行为。 @lang en Button retains owner-bound loadEntry, source, and privacy behavior. */
      const button = item?.querySelector(
        ':scope > button, :scope > details > summary > button'
      )
      if (button) {
        button.click()
        return true
      }
      /** @lang zh-CN unopened 每轮只打开尚未加载的 lazy disclosure；上限防止异常树无限展开。 @lang en Each round opens only unloaded lazy disclosures, while the attempt cap prevents unbounded expansion in a malformed tree. */
      const unopened = [
        ...treeHost.querySelectorAll('details:not([data-loaded="true"])')
      ]
      for (const details of unopened) details.open = true
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return false
  }

  /** @lang zh-CN 当前有效偏好在事件间保持同一对象身份。 @lang en Current valid preferences retain one object identity across events. */
  let preferences = readPreferences()
  // <lang><zh-CN>显式首页选择通过owner既有控件落地，存储被拒绝或保留相反旧值时也能恢复请求语言。</zh-CN><en>Apply an explicit landing choice through the existing owner control even when storage is denied or retains an opposing saved value.</en></lang>
  const routeLocale = root.dataset.hiaPublicRouteLocale
  if (uiLocaleControl && ['zh-CN', 'en'].includes(routeLocale)) {
    uiLocaleControl.value = routeLocale
    uiLocaleControl.dispatchEvent(new Event('change', { bubbles: true }))
  }
  applyPreferences(preferences, false)
  applyProductLocale()
  decorateTree()
  rebuildOutline()
  highlightSettingsPreview()
  highlightVerifiedSources()
  rebuildMobileNavigation()
  // <lang><zh-CN>让 owner 的初始 navigation fetch 先运行，再执行仅在目标仍缺失时生效的 deep-link fallback。</zh-CN><en>Allow the owner's initial navigation fetch to run before invoking the deep-link fallback, which acts only while the target is still missing.</en></lang>
  setTimeout(() => void restoreDeepLink(), 200)

  document
    .querySelector('[data-hia-settings-open]')
    ?.addEventListener('click', () => {
      settingsDialog?.showModal()
    })
  document
    .querySelector('[data-hia-settings-close]')
    ?.addEventListener('click', () => {
      settingsDialog?.close()
    })
  document
    .querySelector('[data-hia-settings-reset]')
    ?.addEventListener('click', () => {
      preferences = { ...defaults }
      applyPreferences(preferences, true)
      rebuildOutline()
    })
  settingsDialog?.addEventListener('change', () => {
    preferences = preferencesFromControls()
    applyPreferences(preferences, true)
    rebuildOutline()
  })
  for (const trigger of document.querySelectorAll('[data-hia-public-search]')) {
    trigger.addEventListener('click', openSearchDialog)
  }
  searchDialog
    ?.querySelector('[data-hia-search-close]')
    ?.addEventListener('click', () => {
      searchDialog.close()
    })
  searchDialog?.addEventListener('click', (event) => {
    if (event.target === searchDialog) searchDialog.close()
  })
  searchInput?.addEventListener('input', filterSearchResults)
  document.addEventListener('keydown', (event) => {
    // <lang><zh-CN>search input 会原生消费 Escape 清空文本；确认稿要求 Escape 直接退出模态，因此在 document 层优先关闭。</zh-CN><en>A search input natively consumes Escape to clear text; the confirmed design requires Escape to exit the modal, so the document handler closes it first.</en></lang>
    if (event.key === 'Escape' && searchDialog?.open) {
      event.preventDefault()
      searchDialog.close()
      return
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLocaleLowerCase() === 'k'
    ) {
      event.preventDefault()
      openSearchDialog()
    }
  })
  document
    .querySelector('[data-hia-public-locale]')
    ?.addEventListener('click', () => {
      if (!uiLocaleControl) return
      uiLocaleControl.value = currentLocale() === 'en' ? 'zh-CN' : 'en'
      uiLocaleControl.dispatchEvent(new Event('change', { bubbles: true }))
    })
  uiLocaleControl?.addEventListener('change', () => {
    applyProductLocale()
    rebuildOutline()
  })
  window.addEventListener('hashchange', () => void restoreDeepLink())
  // <lang><zh-CN>只有返回已标记首页且首页DOM确已被替换时重新加载；API内部hash或普通history状态不触发该分支。</zh-CN><en>Reload only when returning to a marked landing whose DOM has actually been replaced; internal API hashes and ordinary history states do not trigger this branch.</en></lang>
  window.addEventListener('popstate', (event) => {
    if (
      event.state?.hiaPublicLanding === true &&
      contentHost &&
      !contentHost.querySelector('.hia-public-landing')
    ) {
      window.location.reload()
    }
  })

  mobileNavigationHost?.addEventListener('click', (event) => {
    /** @lang zh-CN projectedItem 用 entry id 重新定位权威树节点，不复用克隆节点的丢失监听器。 @lang en ProjectedItem uses the entry ID to relocate the authoritative tree node instead of relying on lost listeners in the clone. */
    const projectedItem = event.target.closest('[data-hia-project-node-id]')
    if (!projectedItem || !treeHost) return
    /** @lang zh-CN nodeId 是生成器提供的稳定导航 identity。 @lang en NodeId is the stable navigation identity supplied by the generator. */
    const nodeId = projectedItem.dataset.hiaProjectNodeId
    const originalItem = [
      ...treeHost.querySelectorAll('[data-hia-project-node-id]')
    ].find((item) => item.dataset.hiaProjectNodeId === nodeId)
    if (!originalItem) return
    if (event.target.closest('summary')) {
      const originalDetails = originalItem.querySelector(':scope > details')
      if (originalDetails) originalDetails.open = true
      return
    }
    const originalButton = originalItem.querySelector(
      ':scope > button, :scope > details > summary > button'
    )
    if (originalButton) {
      // <lang><zh-CN>只为当前投影控件的真实焦点交接；加载期间main接管焦点，用户后移时不再恢复。</zh-CN><en>Transfer only focus owned by the current projected control; main owns it during loading and restoration stops after a user move.</en></lang>
      const ownsFocus = projectedItem.contains(document.activeElement)
      pendingMobileFocus = ownsFocus
        ? {
            entryId: originalItem.dataset.hiaProjectEntryId,
            owner: contentHost
          }
        : null
      originalButton.click()
      const mobileNavigation = document.querySelector(
        '[data-hia-public-mobile-navigation]'
      )
      if (mobileNavigation) mobileNavigation.open = false
      if (ownsFocus && contentHost) {
        contentHost.tabIndex = -1
        contentHost.focus()
      }
    }
  })

  if (contentHost) {
    /** @lang zh-CN detailsToggleObserver 在原生折叠切换后同步页内目录。 @lang en DetailsToggleObserver synchronizes the page outline after native disclosure changes. */
    contentHost.addEventListener(
      'toggle',
      (event) => {
        /** @lang zh-CN changedDetails 只响应 owner topic 的原生 disclosure，不读取或改写 source state。 @lang en ChangedDetails responds only to native owner-topic disclosures and never reads or changes source state. */
        const changedDetails = event.target
        if (changedDetails instanceof HTMLDetailsElement) rebuildOutline()
      },
      true
    )
    /** @lang zh-CN content observer 在 topic 替换或源码状态变化后更新 outline/高亮，不记录正文。 @lang en The content observer updates outline/highlighting after topic replacement or source-state changes and records no body content. */
    const contentObserver = new MutationObserver((changes) => {
      // <lang><zh-CN>目录移入正文后，忽略自身列表替换，避免观察器对自己的派生DOM反复重建。</zh-CN><en>After the outline moves into content, ignore replacement of its own list so the observer cannot repeatedly rebuild its derived DOM.</en></lang>
      if (changes.every((change) => mobileOutline?.contains(change.target)))
        return
      // <lang><zh-CN>条目晚于产品壳到达时，新增复制入口仍使用已保存的当前界面语言。</zh-CN><en>When entries arrive after the shell, restored copy controls still use the persisted current interface language.</en></lang>
      applyProductLocale()
      restoreMobileReadingFocus()
      rebuildOutline()
      highlightVerifiedSources()
    })
    contentObserver.observe(contentHost, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-hia-source-state']
    })
  }
  if (treeHost) {
    /** @lang zh-CN tree observer 覆盖 lazy shard 展开后的装饰与移动投影更新。 @lang en The tree observer updates decoration and the mobile projection after lazy shards expand. */
    const treeObserver = new MutationObserver(() => {
      decorateTree()
      rebuildMobileNavigation()
    })
    treeObserver.observe(treeHost, { childList: true, subtree: true })
  }
  // <lang><zh-CN>先完成所有交互绑定，再移除 no-js 标记；初始化中断时静态导航和 API fallback 仍保持可见。</zh-CN><en>Remove the no-js marker only after every interaction is bound; if initialization aborts, static navigation and API fallbacks remain visible.</en></lang>
  bindPublicEntryLinks()
  root.classList.remove('no-js')
})()

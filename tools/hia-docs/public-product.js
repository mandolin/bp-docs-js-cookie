/**
 * <lang><zh-CN>实现 bp-docs-js-cookie 默认 Portal 的产品壳、显示偏好、移动导航与本页 outline。</zh-CN><en>Implements the product shell, display preferences, mobile navigation, and local outline for the bp-docs-js-cookie default Portal.</en></lang>
 *
 * @module bp-docs-js-cookie/public-product-runtime
 * @lang zh-CN 运行时只访问同页 DOM 和 localStorage 中的非个人显示偏好，不发送分析、credential 或跨源请求。
 * @lang en The runtime accesses only the same-page DOM and non-personal display preferences in localStorage; it sends no analytics, credentials, or cross-origin requests.
 */

;(() => {
  /** @lang zh-CN 产品偏好的单一设备本地 key。 @lang en Sole device-local key for product preferences. */
  const storageKey = 'hia.bp-docs-js-cookie.display.v2'
  /** @lang zh-CN 未找到有效设备偏好时使用的确认稿默认值。 @lang en Confirmed-baseline defaults used when no valid device preference exists. */
  const defaults = Object.freeze({
    siteTheme: 'light',
    codeTheme: 'site',
    codeFontSize: 'default',
    codeWrap: 'scroll',
    codeLines: 'hide',
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
  const messages = Object.freeze({
    'zh-CN': {
      search: '搜索文档',
      searchTitle: '搜索文档',
      searchPlaceholder: '搜索 API 或指南…',
      searchClose: '关闭',
      searchEmpty: '没有匹配结果',
      overview: '概览',
      searchOverview: '项目概览与快速开始',
      searchSet: 'Cookies.set() · 写入 Cookie',
      searchGet: 'Cookies.get() · 读取 Cookie',
      settings: '主题与设置',
      nav: '文档目录',
      outline: '本页内容',
      breadcrumb: '概览',
      settingsTitle: '主题、内容与代码设置',
      apiScope: 'API 显示范围',
      publicApi: '只显示接口 API',
      allApi: '显示全部 API',
      publicApiGroup: '公开接口 API',
      internalApiGroup: '内部实现',
      contentVisibility: '内容显隐',
      metadata: '元数据',
      contract: '契约',
      coverage: '覆盖情况',
      provenance: '溯源',
      relations: '项目关系',
      siteTheme: '站点主题',
      themeSystem: '跟随系统',
      themeLight: '浅色',
      themeDark: '深色',
      codeSettings: '代码区域 / 编辑器设置',
      codeTheme: '代码主题',
      codeThemeSite: '跟随站点',
      codeThemeContrast: '高对比度',
      codeSize: '代码字号',
      sizeSmall: '小',
      sizeDefault: '默认',
      sizeLarge: '大',
      codeWrap: '长行换行',
      wrapScroll: '横向滚动',
      wrapAutomatic: '自动换行',
      lineNumbers: '行号',
      hide: '隐藏',
      show: '显示',
      highlighterNote:
        '源码须先通过字节数与 SHA-384 校验，再进行本地语法高亮；失败时保留纯文本。',
      reading: '阅读设置',
      contentWidth: '正文宽度',
      widthComfortable: '舒适',
      widthWide: '宽幅',
      privacy: '仅保存显示偏好；不关联账号、不发送分析数据。',
      reset: '恢复默认',
      close: '关闭',
      saved: '设置已保存在此设备。'
    },
    en: {
      search: 'Search documentation',
      searchTitle: 'Search documentation',
      searchPlaceholder: 'Search APIs or guides…',
      searchClose: 'Close',
      searchEmpty: 'No matching result',
      overview: 'Overview',
      searchOverview: 'Project overview and quick start',
      searchSet: 'Cookies.set() · write a Cookie',
      searchGet: 'Cookies.get() · read a Cookie',
      settings: 'Theme & settings',
      nav: 'Documentation menu',
      outline: 'On this page',
      breadcrumb: 'Overview',
      settingsTitle: 'Theme, content, and code settings',
      apiScope: 'API visibility',
      publicApi: 'Public APIs only',
      allApi: 'Show all APIs',
      publicApiGroup: 'Public API',
      internalApiGroup: 'Internal implementation',
      contentVisibility: 'Content visibility',
      metadata: 'Metadata',
      contract: 'Contract',
      coverage: 'Coverage',
      provenance: 'Provenance',
      relations: 'Project relations',
      siteTheme: 'Site theme',
      themeSystem: 'System',
      themeLight: 'Light',
      themeDark: 'Dark',
      codeSettings: 'Code area / editor settings',
      codeTheme: 'Code theme',
      codeThemeSite: 'Follow site',
      codeThemeContrast: 'High contrast',
      codeSize: 'Code size',
      sizeSmall: 'Small',
      sizeDefault: 'Default',
      sizeLarge: 'Large',
      codeWrap: 'Long-line wrapping',
      wrapScroll: 'Horizontal scroll',
      wrapAutomatic: 'Wrap',
      lineNumbers: 'Line numbers',
      hide: 'Hide',
      show: 'Show',
      highlighterNote:
        'Source is highlighted locally only after byte-length and SHA-384 verification; failures remain plain text.',
      reading: 'Reading settings',
      contentWidth: 'Content width',
      widthComfortable: 'Comfortable',
      widthWide: 'Wide',
      privacy:
        'Only display preferences are stored; no account link or analytics.',
      reset: 'Reset defaults',
      close: 'Close',
      saved: 'Settings saved on this device.'
    }
  })

  /** @lang zh-CN 根元素承载所有无脚本可忽略的显示状态。 @lang en Root element carries all display state that can be ignored without scripts. */
  const root = document.documentElement
  /** @lang zh-CN 原 Portal locale 控件仍是正文 locale 的权威入口。 @lang en The original Portal locale control remains authoritative for content locale. */
  const localeControl = document.querySelector('[data-hia-locale-control]')
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
  /** @lang zh-CN breadcrumb 当前节点标签。 @lang en Current-node label in the breadcrumb. */
  const breadcrumbCurrent = document.querySelector(
    '[data-hia-public-breadcrumb-current]'
  )
  /** @lang zh-CN 设置保存状态使用 polite live region。 @lang en Settings status uses a polite live region. */
  const settingsStatus = document.querySelector('[data-hia-settings-status]')

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
    return localeControl?.value === 'en' || root.lang === 'en' ? 'en' : 'zh-CN'
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
    for (const element of document.querySelectorAll('[data-hia-public-i18n]')) {
      element.textContent = translate(element.dataset.hiaPublicI18n)
    }
    for (const element of document.querySelectorAll(
      '[data-hia-public-i18n-placeholder]'
    )) {
      element.setAttribute(
        'placeholder',
        translate(element.dataset.hiaPublicI18nPlaceholder)
      )
    }
    /** @lang zh-CN locale button 文本表示下一次切换目标。 @lang en The locale-button text represents the next switch target. */
    const localeButton = document.querySelector('[data-hia-public-locale]')
    if (localeButton)
      localeButton.textContent = currentLocale() === 'en' ? '中' : 'EN'
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

    for (const control of document.querySelectorAll('[data-hia-preference]')) {
      /** @lang zh-CN field 由 builder 生成的 closed data attribute 提供。 @lang en Field comes from a closed data attribute generated by the builder. */
      const field = control.dataset.hiaPreference
      if (control.type === 'radio')
        control.checked = control.value === preferences[field]
      else if (control.type === 'checkbox')
        control.checked = preferences[field] === 'show'
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
        next[field] = checkbox.checked ? 'show' : 'hide'
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
    const activeArticle = document.getElementById(activeEntryIdentity())
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
    /** @lang zh-CN section 从稳定 topic attribute 或 landing 父 section 读取。 @lang en Section comes from the stable topic attribute or the landing parent section. */
    const section =
      candidate.closest('[data-hia-topic-section]')?.dataset.hiaTopicSection ||
      candidate.closest('[data-hia-content-section]')?.dataset
        .hiaContentSection ||
      ''
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
      else if (nodeId.includes(':repository:') && !nodeId.includes('|'))
        kind = 'repository'
      else if (nodeId.includes(':package:') && !nodeId.includes(':entry:'))
        kind = 'package'
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
    }
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
      /** @lang zh-CN code 是 owner 以 textContent 写入的不可执行源码节点。 @lang en Code is the non-executable source node written by the owner via textContent. */
      const code = details.querySelector('code')
      if (!code) continue
      if (details.dataset.hiaSourceState !== 'ready') {
        delete code.dataset.hiaPrismIntegrity
        continue
      }
      /** @lang zh-CN integrity 同时是 owner 已验证内容的稳定本地标记。 @lang en Integrity also serves as the stable local marker for owner-verified content. */
      const integrity = details.dataset.hiaSourceIntegrity || ''
      if (code.dataset.hiaPrismIntegrity === integrity) continue
      code.classList.add('language-javascript')
      code.parentElement?.classList.add('line-numbers')
      try {
        if (!globalThis.Prism?.highlightElement) return
        code.dataset.hiaPrismIntegrity = integrity
        globalThis.Prism.highlightElement(code)
      } catch {
        // <lang><zh-CN>高亮失败只降级为已校验纯文本，不改变源码状态或发起备用请求。</zh-CN><en>Highlighting failure degrades only to verified plain text and changes neither source state nor network behavior.</en></lang>
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
   * <lang><zh-CN>从当前 topic 的真实节点生成桌面与移动 outline。</zh-CN><en>Builds desktop and mobile outlines from real nodes in the current topic.</en></lang>
   *
   * @returns {void}
   */
  function rebuildOutline() {
    if (!contentHost || !outlineHost || !mobileOutlineHost) return
    /** @lang zh-CN topicScope 优先使用当前 identity 对应的 article，避免把同容器 sibling 混入页面 outline。 @lang en TopicScope prefers the article matching the current identity so sibling entries in the same container cannot leak into the page outline. */
    const topicScope = projectActiveArticle()
    /** @lang zh-CN candidates 优先使用语义 section summary，landing 则使用 h2。 @lang en Candidates prefer semantic section summaries and use h2 elements on the landing page. */
    const candidates = (
      topicScope
        ? [...topicScope.querySelectorAll(':scope > details > summary')]
        : [
            ...contentHost.querySelectorAll(
              ':scope > article > details > summary, :scope > article h2[id]'
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
      link.textContent = candidate.textContent?.trim() || `Section ${index + 1}`
      link.addEventListener('click', () => {
        if (target.tagName === 'DETAILS') target.open = true
      })
      item.append(link)
      list.append(item)
    })
    outlineHost.replaceChildren(list)
    mobileOutlineHost.replaceChildren(list.cloneNode(true))

    /** @lang zh-CN 当前 label 只取可见 topic heading，不读取 search index 或源码正文。 @lang en Current label uses only the visible topic heading and reads neither the search index nor source bodies. */
    const heading = (topicScope || contentHost).querySelector('h1, h2')
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent =
        heading?.textContent?.trim() || translate('breadcrumb')
    }
  }

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
      if (!localeControl) return
      localeControl.value = currentLocale() === 'en' ? 'zh-CN' : 'en'
      localeControl.dispatchEvent(new Event('change', { bubbles: true }))
      applyProductLocale()
      rebuildOutline()
    })
  localeControl?.addEventListener('change', () => {
    applyProductLocale()
    rebuildOutline()
  })
  window.addEventListener('hashchange', () => void restoreDeepLink())

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
      originalButton.click()
      const mobileNavigation = document.querySelector(
        '[data-hia-public-mobile-navigation]'
      )
      if (mobileNavigation) mobileNavigation.open = false
    }
  })

  if (contentHost) {
    /** @lang zh-CN content observer 在 topic 替换或源码状态变化后更新 outline/高亮，不记录正文。 @lang en The content observer updates outline/highlighting after topic replacement or source-state changes and records no body content. */
    const contentObserver = new MutationObserver(() => {
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
})()

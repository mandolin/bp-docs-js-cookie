/**
 * <lang><zh-CN>实现 bp-docs-js-cookie 默认 Portal 的产品壳、显示偏好、移动导航与本页 outline。</zh-CN><en>Implements the product shell, display preferences, mobile navigation, and local outline for the bp-docs-js-cookie default Portal.</en></lang>
 *
 * @module bp-docs-js-cookie/public-product-runtime
 * @lang zh-CN 运行时只访问同页 DOM 和 localStorage 中的非个人显示偏好，不发送分析、credential 或跨源请求。
 * @lang en The runtime accesses only the same-page DOM and non-personal display preferences in localStorage; it sends no analytics, credentials, or cross-origin requests.
 */

(() => {
  /** @lang zh-CN 产品偏好的单一设备本地 key。 @lang en Sole device-local key for product preferences. */
  const storageKey = 'hia.bp-docs-js-cookie.display.v1'
  /** @lang zh-CN 未找到有效设备偏好时使用的确认稿默认值。 @lang en Confirmed-baseline defaults used when no valid device preference exists. */
  const defaults = Object.freeze({
    siteTheme: 'light',
    codeTheme: 'site',
    codeFontSize: 'default',
    codeWrap: 'scroll',
    codeLines: 'hide',
    contentWidth: 'comfortable'
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
    contentWidth: ['comfortable', 'wide']
  })
  /** @lang zh-CN 产品壳自身的最小双语词典；owner 全量 locale 治理由 W-P125 承担。 @lang en Minimal bilingual dictionary for this product shell; W-P125 owns full owner-locale adoption. */
  const messages = Object.freeze({
    'zh-CN': {
      search: '搜索文档',
      settings: '主题与设置',
      nav: '文档目录',
      outline: '本页内容',
      breadcrumb: '概览',
      settingsTitle: '显示与代码设置',
      siteTheme: '站点主题',
      codeSettings: '代码区域 / 编辑器设置',
      reading: '阅读设置',
      privacy: '仅保存显示偏好；不关联账号、不发送分析数据。',
      reset: '恢复默认',
      close: '关闭',
      saved: '设置已保存在此设备。'
    },
    en: {
      search: 'Search documentation',
      settings: 'Theme & settings',
      nav: 'Documentation menu',
      outline: 'On this page',
      breadcrumb: 'Overview',
      settingsTitle: 'Display and code settings',
      siteTheme: 'Site theme',
      codeSettings: 'Code area / editor settings',
      reading: 'Reading settings',
      privacy: 'Only display preferences are stored; no account link or analytics.',
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
    let parsed = {}
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
    /** @lang zh-CN locale button 文本表示下一次切换目标。 @lang en The locale-button text represents the next switch target. */
    const localeButton = document.querySelector('[data-hia-public-locale]')
    if (localeButton) localeButton.textContent = currentLocale() === 'en' ? '中' : 'EN'
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

    for (const control of document.querySelectorAll('[data-hia-preference]')) {
      /** @lang zh-CN field 由 builder 生成的 closed data attribute 提供。 @lang en Field comes from a closed data attribute generated by the builder. */
      const field = control.dataset.hiaPreference
      if (control.type === 'radio') control.checked = control.value === preferences[field]
      else if (control.type === 'checkbox') control.checked = control.value === preferences[field]
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
      /** @lang zh-CN checked radio 或普通 select 是该字段的唯一输入。 @lang en The checked radio or ordinary select is the sole input for this field. */
      const control = document.querySelector(
        `[data-hia-preference="${field}"]:checked, select[data-hia-preference="${field}"]`
      )
      if (control && allowed[field].includes(control.value)) next[field] = control.value
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
    const siblings = contentHost.querySelectorAll(':scope > article.hia-project-entry')
    for (const article of siblings) article.hidden = article !== activeArticle
    activeArticle.hidden = false
    return activeArticle
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
    const candidates = topicScope
      ? [...topicScope.querySelectorAll(':scope > details > summary')]
      : [
          ...contentHost.querySelectorAll(
            ':scope > article > details > summary, :scope > article h2[id]'
          )
        ]
    /** @lang zh-CN list 是两个 outline host 共用的临时无序列表。 @lang en List is the temporary unordered list shared by both outline hosts. */
    const list = document.createElement('ul')
    list.className = 'hia-public-outline-list'
    candidates.slice(0, 12).forEach((candidate, index) => {
      /** @lang zh-CN target 是 summary 的 details 或已有标题节点。 @lang en Target is the summary's details element or an existing heading node. */
      const target = candidate.tagName === 'SUMMARY' ? candidate.parentElement : candidate
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
      breadcrumbCurrent.textContent = heading?.textContent?.trim() || translate('breadcrumb')
    }
  }

  /**
   * <lang><zh-CN>把已加载的权威树投影到窄屏原生 disclosure。</zh-CN><en>Projects the loaded authoritative tree into the narrow-screen native disclosure.</en></lang>
   *
   * @returns {void}
   */
  function rebuildMobileNavigation() {
    if (!treeHost || !mobileNavigationHost) return
    mobileNavigationHost.replaceChildren(...[...treeHost.children].map((node) => node.cloneNode(true)))
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
    for (let attempt = 0; attempt < 8; attempt += 1) {
      /** @lang zh-CN item 通过稳定 entry identity 在权威树中定位。 @lang en Item is located in the authoritative tree by stable entry identity. */
      const item = [...treeHost.querySelectorAll('[data-hia-project-entry-id]')].find(
        (candidate) => candidate.dataset.hiaProjectEntryId === identity
      )
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
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
    return false
  }

  /** @lang zh-CN 当前有效偏好在事件间保持同一对象身份。 @lang en Current valid preferences retain one object identity across events. */
  let preferences = readPreferences()
  applyPreferences(preferences, false)
  applyProductLocale()
  rebuildOutline()
  rebuildMobileNavigation()
  // <lang><zh-CN>让 owner 的初始 navigation fetch 先运行，再执行仅在目标仍缺失时生效的 deep-link fallback。</zh-CN><en>Allow the owner's initial navigation fetch to run before invoking the deep-link fallback, which acts only while the target is still missing.</en></lang>
  setTimeout(() => void restoreDeepLink(), 200)

  document.querySelector('[data-hia-settings-open]')?.addEventListener('click', () => {
    settingsDialog?.showModal()
  })
  document.querySelector('[data-hia-settings-close]')?.addEventListener('click', () => {
    settingsDialog?.close()
  })
  document.querySelector('[data-hia-settings-reset]')?.addEventListener('click', () => {
    preferences = { ...defaults }
    applyPreferences(preferences, true)
  })
  settingsDialog?.addEventListener('change', () => {
    preferences = preferencesFromControls()
    applyPreferences(preferences, true)
  })
  document.querySelector('[data-hia-public-search]')?.addEventListener('click', () => {
    /** @lang zh-CN 既有 Portal search input 继续承担检索；header 只提供稳定入口。 @lang en The existing Portal search input continues to own search; the header only provides a stable entry. */
    const search = document.querySelector('[data-hia-project-search]')
    search?.focus()
    search?.scrollIntoView({ block: 'center' })
  })
  document.querySelector('[data-hia-public-locale]')?.addEventListener('click', () => {
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
    const originalItem = [...treeHost.querySelectorAll('[data-hia-project-node-id]')].find(
      (item) => item.dataset.hiaProjectNodeId === nodeId
    )
    if (!originalItem) return
    if (event.target.closest('summary')) {
      const originalDetails = originalItem.querySelector(':scope > details')
      if (originalDetails) originalDetails.open = true
      return
    }
    const originalButton = originalItem.querySelector(':scope > button, :scope > details > summary > button')
    if (originalButton) {
      originalButton.click()
      const mobileNavigation = document.querySelector('[data-hia-public-mobile-navigation]')
      if (mobileNavigation) mobileNavigation.open = false
    }
  })

  if (contentHost) {
    /** @lang zh-CN content observer 只在 Portal 替换 topic 后重建产品 chrome，不记录正文。 @lang en The content observer only rebuilds product chrome after Portal replaces a topic and records no content. */
    const contentObserver = new MutationObserver(() => rebuildOutline())
    contentObserver.observe(contentHost, { childList: true })
  }
  if (treeHost) {
    /** @lang zh-CN tree observer 覆盖 lazy shard 展开后的移动投影更新。 @lang en The tree observer updates the mobile projection after lazy shards expand. */
    const treeObserver = new MutationObserver(() => rebuildMobileNavigation())
    treeObserver.observe(treeHost, { childList: true, subtree: true })
  }
})()

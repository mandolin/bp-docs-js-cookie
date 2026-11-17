/**
 * @module bp-docs-js-cookie/public-locales
 * @lang zh-CN 从同一默认Portal生成显式双语首页，共享原资产及文档身份，支持禁脚本阅读。
 * @lang en Generate explicit bilingual landings from the same default Portal, sharing assets and documentation identities with no-script reading.
 */
import fs from 'node:fs'
import path from 'node:path'
import { escapePublicHtml } from './public-artifact.mjs'
import { PUBLIC_PRODUCT_MESSAGES } from './public-messages.mjs'

/** @lang zh-CN 完整script元素作为不透明块保留，翻译器仅处理生成器标记的HTML叶节点和属性。 @lang en Preserve complete script elements as opaque blocks, translating only generator-marked HTML leaf nodes and attributes. */
const scripts = /<script\b[\s\S]*?<\/script>/giu

/**
 * @lang zh-CN 本地化已生成的默认首页，显式链接语言优先于设备偏好，正文和代码脚本原样保留。
 * @lang en Localize the generated landing, giving an explicit link locale precedence over device preferences while preserving prose and code scripts.
 * @param {string} html <lang><zh-CN>已增强的真实默认Portal HTML，含owner UI JSON和产品词典绑定。</zh-CN><en>Enhanced default-Portal HTML containing owner UI JSON and product-catalog bindings.</en></lang>
 * @param {'zh-CN'|'en'} locale <lang><zh-CN>固定支持的目标语言。</zh-CN><en>Target locale from the fixed supported set.</en></lang>
 * @returns {string} <lang><zh-CN>同根静态本地化页面；脚本关闭时首屏也保持该语言。</zh-CN><en>Same-root static localized page retaining its language on first paint with scripts disabled.</en></lang>
 * @throws {Error} <lang><zh-CN>语言、owner UI结构、词条或叶节点形态不受支持时拒绝生成。</zh-CN><en>Reject unsupported locales, owner UI structure, messages, or leaf-node shapes.</en></lang>
 */
export function renderLocaleLanding(html, locale) {
  if (!['zh-CN', 'en'].includes(locale))
    throw new Error('Unsupported Portal locale.')
  // <lang><zh-CN>owner UI本身是生成器序列化的JSON；只解析这一明确字段，不执行外层脚本。</zh-CN><en>The owner UI is generator-serialized JSON. Parse only this explicit field without executing its surrounding script.</en></lang>
  const owner = html.match(
    / ui: (\{"bundles":[\s\S]*?,"initialLocale":"[^"]+","supportedLocales":\[[^\]]*\]\})/u
  )
  if (!owner) throw new Error('Default Portal UI bundle is missing.')
  const ownerMessages = JSON.parse(owner[1]).bundles[locale]
  if (!ownerMessages)
    throw new Error('Default Portal UI bundle lacks the locale.')
  // <lang><zh-CN>必须命中每个可见翻译槽，嵌套或变更后的owner结构会在写文件前失败。</zh-CN><en>Every visible translation slot must match. Nested or changed owner structures fail before files are written.</en></lang>
  const expectedSlots =
    html.replace(scripts, '').match(/\bdata-hia-(?:public-i18n|ui-message)="/gu)
      ?.length || 0
  let translatedSlots = 0
  const leafNodes =
    /<script\b[\s\S]*?<\/script>|<([a-z][\w:-]*)\b([^>]*\bdata-hia-(public-i18n|ui-message)="([^"]+)"[^>]*)>[^<]*<\/\1>/giu
  let result =
    locale === 'en'
      ? html.replace(
          'data-hia-public-i18n-aria="switchToEnglish"',
          'data-hia-public-i18n-aria="switchToChinese"'
        )
      : html
  result = result.replace(leafNodes, (original, tag, attributes, kind, key) => {
    if (!tag) return original
    const message = (
      kind === 'public-i18n' ? PUBLIC_PRODUCT_MESSAGES[locale] : ownerMessages
    )[key]
    if (typeof message !== 'string')
      throw new Error(`Unknown Portal message: ${key}`)
    translatedSlots += 1
    return `<${tag}${attributes}>${escapePublicHtml(message)}</${tag}>`
  })
  if (translatedSlots !== expectedSlots)
    throw new Error('Unsupported Portal translation slot.')
  // <lang><zh-CN>只在HTML起始标签中翻译属性和准确的站内首页链接，脚本中的HTML示例保持原字节。</zh-CN><en>Translate attributes and exact local landing links only in HTML opening tags, preserving HTML examples inside scripts byte for byte.</en></lang>
  result = result.replace(
    /<script\b[\s\S]*?<\/script>|<[a-z][^>]*>/giu,
    (original) => {
      if (/^<script\b/iu.test(original)) return original
      let tag = original
      for (const [marker, attribute, catalog] of [
        ['public-i18n-aria', 'aria-label', PUBLIC_PRODUCT_MESSAGES[locale]],
        [
          'public-i18n-placeholder',
          'placeholder',
          PUBLIC_PRODUCT_MESSAGES[locale]
        ],
        ['ui-aria', 'aria-label', ownerMessages],
        ['ui-placeholder', 'placeholder', ownerMessages]
      ]) {
        const key = tag.match(
          new RegExp(`\\bdata-hia-${marker}="([^"]+)"`, 'u')
        )?.[1]
        if (!key) continue
        const message = catalog[key]
        if (typeof message !== 'string')
          throw new Error(`Unknown Portal message: ${key}`)
        tag = tag.replace(
          new RegExp(`\\b${attribute}="[^"]*"`, 'u'),
          `${attribute}="${escapePublicHtml(message)}"`
        )
      }
      return tag
        .replace('href="./"', `href="index.${locale}.html"`)
        .replace('href="pages/index.html"', `href="pages/${locale}/index.html"`)
    }
  )
  // <lang><zh-CN>选中态沿用owner现有UI控件；内容语言控件继续由既有文档模型治理。</zh-CN><en>Use the existing owner UI control for selection while the document model retains ownership of content-locale controls.</en></lang>
  result = result.replace(
    /(<select\b[^>]*\bdata-hia-ui-locale-control[^>]*>)([\s\S]*?)(<\/select>)/u,
    (_original, start, options, end) =>
      start +
      options.replace(/<option\b([^>]*)>/gu, (_option, attributes) => {
        const clean = attributes.replace(/\sselected(?:="[^"]*")?/gu, '')
        return `<option${clean}${clean.includes(`value="${locale}"`) ? ' selected' : ''}>`
      }) +
      end
  )
  result = result.replace(
    /<html\b([^>]*)\blang="[^"]*"/u,
    `<html$1data-hia-public-route-locale="${locale}" lang="${locale}"`
  )
  // <lang><zh-CN>尽早种下显式语言，存储拒绝时静态HTML和运行期控件校正继续有效。</zh-CN><en>Seed the explicit locale early. Static HTML and runtime control correction remain effective when storage is denied.</en></lang>
  const bootstrap = `<script data-hia-public-route-init>/* <lang><zh-CN>明确链接选择当前界面语言。</zh-CN><en>The explicit link selects this UI locale.</en></lang> */try{localStorage.setItem('hia-doc-portal-ui-locale',${JSON.stringify(locale)})}catch{}</script>`
  result = result.replace('</head>', bootstrap + '</head>')
  if (locale === 'en') {
    result = result.replace(
      /(<button\b[^>]*\bdata-hia-public-locale[^>]*>)EN(<\/button>)/u,
      '$1中$2'
    )
  }
  return result
}

/**
 * @lang zh-CN 先完整验证两个语言首页，再写入同根别名；默认根文件和共享资产继续由原生产链提供。
 * @lang en Validate both locale landings before writing same-root aliases. The original pipeline continues to supply the neutral root and shared assets.
 * @param {string} publicRoot <lang><zh-CN>本次正常构建的绝对public目录。</zh-CN><en>Absolute public directory from this normal build.</en></lang>
 * @returns {void} <lang><zh-CN>完成两个语言文件写入。</zh-CN><en>Complete writing both locale files.</en></lang>
 * @throws {Error} <lang><zh-CN>根目录不合适、别名已存在或输入无法完整本地化时抛出。</zh-CN><en>Throw for an unsuitable root, existing aliases, or inputs that cannot be completely localized.</en></lang>
 */
export function materializeLocaleLandings(publicRoot) {
  if (!path.isAbsolute(publicRoot) || path.basename(publicRoot) !== 'public')
    throw new Error('Invalid localized Portal root.')
  const source = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8')
  const pages = ['zh-CN', 'en'].map((locale) => ({
    file: path.join(publicRoot, `index.${locale}.html`),
    html: renderLocaleLanding(source, locale)
  }))
  if (pages.some((page) => fs.existsSync(page.file)))
    throw new Error('Localized Portal landing already exists.')
  for (const page of pages) fs.writeFileSync(page.file, page.html, 'utf8')
}

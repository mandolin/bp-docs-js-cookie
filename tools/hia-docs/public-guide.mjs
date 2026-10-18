/**
 * <lang><zh-CN>把经确认的第一方访客偏好指南作为独立双语范围加入默认 Portal public artifact。</zh-CN><en>Materializes the confirmed first-party visitor preference guide as an independent bilingual scope in the default Portal public artifact.</en></lang>
 *
 * @module bp-docs-js-cookie/public-guide
 * @lang zh-CN 只复制固定 allowlist 中的静态 HTML/CSS；校验资源、隐私标记、站内路由和片段，并给现有 Portal 首页添加 opt-in 入口。
 * @lang en Copies only a fixed allowlist of static HTML/CSS; validates resources, privacy markers, same-site routes and fragments, and adds an opt-in entry to the existing Portal landing.
 */

import fs from 'node:fs'
import path from 'node:path'

/** @lang zh-CN 新增指南的设计基线身份；与 default Portal baseline B 并列而不取代。 @lang en Design-baseline identity for the new guide; additive to, and not a replacement for, default Portal baseline B. */
const GUIDE_BASELINE_ID = 'BP-JS-COOKIE-PREFERENCE-GUIDE-BASELINE-20261019-A'
/** @lang zh-CN 指南设计基线版本。 @lang en Guide design-baseline version. */
const GUIDE_BASELINE_VERSION = '0.1.0'
/** @lang zh-CN BP 仓内经过整理的公开页面源目录。 @lang en Public page-source directory curated within the BP repository. */
const GUIDE_SOURCE_PATH = 'docs/hia/guides/first-party-preferences'
/** @lang zh-CN 站点根下的独立指南 route。 @lang en Independent guide route beneath the site root. */
const GUIDE_PUBLIC_ROUTE = 'guides/first-party-preferences/'
/** @lang zh-CN 可进入公开 artifact 的全部页面和样式闭集；不复制候选 server 或内部 metadata。 @lang en Closed set of pages and styles allowed into the public artifact; candidate servers and internal metadata are excluded. */
const GUIDE_SOURCE_FILES = Object.freeze([
  'index.html',
  'index.en.html',
  'guides/preferences.html',
  'guides/preferences.en.html',
  'guides/troubleshooting.html',
  'guides/troubleshooting.en.html',
  'assets/guide-portal.css'
])

/**
 * <lang><zh-CN>判断解析后的目标是否仍位于指定根目录中。</lang><en>Determines whether a resolved target remains inside its designated root.</en></lang>
 *
 * @param {string} root <lang><zh-CN>规范化后的根目录。</zh-CN><en>Normalized root directory.</en></lang>
 * @param {string} target <lang><zh-CN>待检查的绝对目标路径。</zh-CN><en>Absolute target path to check.</en></lang>
 * @param {string} label <lang><zh-CN>供失败诊断使用的安全标签。</zh-CN><en>Safe label used in failure diagnostics.</en></lang>
 * @returns {void} <lang><zh-CN>目标在边界内时无返回值。</zh-CN><en>No return value when the target stays within the boundary.</en></lang>
 * @throws {Error} <lang><zh-CN>目标逃出根目录或指向根目录本身时抛出。</zh-CN><en>Thrown when the target escapes the root or points to the root itself.</en></lang>
 */
function assertChildPath(root, target, label) {
  // <lang><zh-CN>relativePath 只用于判断边界，不向 evidence 或公开页面序列化宿主绝对路径。</zh-CN><en>RelativePath is used only for boundary checks; host absolute paths are never serialized into evidence or public pages.</en></lang>
  const relativePath = path.relative(root, target)
  // <lang><zh-CN>路径必须是严格子项；空路径、上溯路径和绝对相对结果均拒绝。</zh-CN><en>The path must be a strict child; empty, upward-traversal, and absolute relative results are rejected.</en></lang>
  if (
    relativePath === '' ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`${label} escapes its documentation boundary.`)
  }
}

/**
 * <lang><zh-CN>检查指南 HTML/CSS 的静态内容、资源来源与公开事实边界。</lang><en>Checks guide HTML/CSS for static delivery, resource origins, and public fact boundaries.</en></lang>
 *
 * @param {string} filePath <lang><zh-CN>已通过边界检查的源文件绝对路径。</zh-CN><en>Absolute source-file path already checked against its boundary.</en></lang>
 * @param {string} relativePath <lang><zh-CN>allowlist 中的相对文件名。</zh-CN><en>Allowlisted relative filename.</en></lang>
 * @returns {string} <lang><zh-CN>通过检查的 UTF-8 文件正文。</zh-CN><en>UTF-8 file content that passed validation.</en></lang>
 * @throws {Error} <lang><zh-CN>发现候选标记、脚本、远端资源、路径泄漏或非普通文件时抛出。</zh-CN><en>Thrown when candidate markers, scripts, remote resources, path leaks, or non-regular files are found.</en></lang>
 */
function readValidatedGuideSource(filePath, relativePath) {
  // <lang><zh-CN>fileStat 使用 lstat，拒绝符号链接以免复制 allowlist 外内容。</zh-CN><en>FileStat uses lstat to reject symlinks that could copy content outside the allowlist.</en></lang>
  const fileStat = fs.lstatSync(filePath)
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`Guide source is not a regular file: ${relativePath}`)
  }

  // <lang><zh-CN>content 按 UTF-8 读取，供源码检查、路由扫描和字节不变复制共同使用。</zh-CN><en>Content is read as UTF-8 for source checks and route scanning; the original file bytes are copied separately without re-encoding.</en></lang>
  const content = fs.readFileSync(filePath, 'utf8')
  // <lang><zh-CN>候选身份和 noindex 状态不能进入生产页面；确认基线由发布 manifest 单独标识。</zh-CN><en>Candidate identity and noindex state must not enter production pages; the confirmed baseline is identified separately in the publication manifest.</en></lang>
  if (/\b(?:W-P133|candidate-status|noindex)\b/iu.test(content)) {
    throw new Error(`Guide source retains review-only markers: ${relativePath}`)
  }
  // <lang><zh-CN>静态页面不执行脚本、嵌入活动内容或远端载体；文字中的 script/no-script 不匹配此标签检查。</zh-CN><en>Static pages cannot execute scripts or embed active/remote content; prose mentioning script or no-script does not match these tag checks.</en></lang>
  if (relativePath.endsWith('.html')) {
    if (/<\s*(?:script|iframe|object|embed|video|audio)\b/iu.test(content)) {
      throw new Error(`Guide HTML contains an active or embedded element: ${relativePath}`)
    }
    if (/<(?:link|img|source|script)\b[^>]*\b(?:src|href)=['"](?:https?:)?\/\//iu.test(content)) {
      throw new Error(`Guide HTML references a remote resource: ${relativePath}`)
    }
  }
  // <lang><zh-CN>CSS 只可加载本地默认字体栈与自身规则，禁止远端 @import/font/image 请求。</lang><en>CSS may use local fallback font stacks and its own rules only; remote imports, fonts, and image requests are rejected.</en></lang>
  if (
    relativePath.endsWith('.css') &&
    /@import\s|url\(\s*['"]?(?:https?:)?\/\//iu.test(content)
  ) {
    throw new Error('Guide stylesheet references a remote resource.')
  }
  // <lang><zh-CN>驱动器绝对路径、用户目录、生产 Set-Cookie 和真实 secret 不应出现在公开文档源中。</zh-CN><en>Drive-absolute paths, user profiles, production Set-Cookie values, and real secrets must not appear in public guide sources.</en></lang>
  if (
    /\b[A-Z]:[\\/]|(?:Users|Documents and Settings)[\\/][^\\/\s]+[\\/]|Set-Cookie\s*:/iu.test(
      content
    )
  ) {
    throw new Error(`Guide source contains a private path or cookie header: ${relativePath}`)
  }
  return content
}

/**
 * <lang><zh-CN>确认 fragment 在目标 HTML 中对应一个 id 或 name。</zh-CN><en>Confirms that a fragment corresponds to an id or name in the target HTML.</en></lang>
 *
 * @param {string} targetText <lang><zh-CN>目标 HTML 正文。</zh-CN><en>Target HTML content.</en></lang>
 * @param {string} fragment <lang><zh-CN>已解码的片段标识。</zh-CN><en>Decoded fragment identifier.</en></lang>
 * @param {string} relativePage <lang><zh-CN>来源页面的站点相对路径。</zh-CN><en>Site-relative path of the source page.</en></lang>
 * @returns {void} <lang><zh-CN>片段存在时无返回值。</zh-CN><en>No return value when the fragment exists.</en></lang>
 * @throws {Error} <lang><zh-CN>片段不存在时抛出。</zh-CN><en>Thrown when the fragment is absent.</en></lang>
 */
function assertFragmentTarget(targetText, fragment, relativePage) {
  // <lang><zh-CN>escapedFragment 将片段作为字面 id 匹配，避免把标点解释成正则操作符。</zh-CN><en>EscapedFragment matches the identifier literally so punctuation cannot become a regular-expression operator.</en></lang>
  const escapedFragment = fragment.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  // <lang><zh-CN>属性值要求为完整匹配，避免误命中更长的相似 id。</zh-CN><en>The full attribute value must match so a longer, similar identifier cannot pass accidentally.</en></lang>
  const hasTarget = new RegExp(`(?:\\bid|\\bname)=["']${escapedFragment}["']`, 'u').test(
    targetText
  )
  if (!hasTarget) {
    throw new Error(`Guide fragment target is missing: ${relativePage}`)
  }
}

/**
 * <lang><zh-CN>解析并验证公开 HTML 的站内链接和 fragment target。</zh-CN><en>Resolves and validates same-site links and fragment targets in public HTML.</en></lang>
 *
 * @param {string} publicRoot <lang><zh-CN>本次 build 的公开 artifact 根。</zh-CN><en>Public artifact root for this build.</en></lang>
 * @param {string} relativePage <lang><zh-CN>相对公开根的 HTML 页面路径。</zh-CN><en>HTML path relative to the public root.</en></lang>
 * @param {string} content <lang><zh-CN>当前 HTML 正文。</zh-CN><en>Current HTML content.</en></lang>
 * @returns {void} <lang><zh-CN>所有站内链接均可达时无返回值。</zh-CN><en>No return value when every same-site link is reachable.</en></lang>
 * @throws {Error} <lang><zh-CN>站内路径逃逸、页面缺失或 fragment 不存在时抛出。</zh-CN><en>Thrown when a same-site path escapes the root, a page is missing, or a fragment is absent.</en></lang>
 */
function validateLocalLinks(publicRoot, relativePage, content) {
  // <lang><zh-CN>pagePath 固定在 publicRoot 内；href 中的相对路径按浏览器文件所在目录解析。</zh-CN><en>PagePath is fixed inside publicRoot; relative href values resolve from the directory containing the page.</en></lang>
  const pagePath = path.resolve(publicRoot, ...relativePage.split('/'))
  // <lang><zh-CN>hrefValues 枚举双引号和单引号属性，其他链接形式由源格式检查维持为稳定 HTML。</zh-CN><en>HrefValues collects both quoted attribute styles while the authored pages retain stable HTML formatting.</en></lang>
  const hrefValues = [...content.matchAll(/\bhref\s*=\s*(['"])(.*?)\1/giu)]

  for (const hrefMatch of hrefValues) {
    // <lang><zh-CN>rawHref 是站点导航或外部用户主动链接；绝对外部链接不构成页面资源请求。</zh-CN><en>RawHref is navigation or an external user-activated link; external anchors are not page resource requests.</en></lang>
    const rawHref = hrefMatch[2]
    if (/^(?:https?:|mailto:|tel:|\/\/)/iu.test(rawHref)) {
      continue
    }
    if (/^(?:data:|javascript:)/iu.test(rawHref)) {
      throw new Error(`Guide link uses a non-navigation URL scheme: ${relativePage}`)
    }

    // <lang><zh-CN>hrefParts 拆分路径和 fragment；fragment 校验保留原编码，不借助远程解析器。</zh-CN><en>HrefParts separates path and fragment without using a remote resolver.</en></lang>
    const hrefParts = rawHref.split('#', 2)
    const rawPath = hrefParts[0].split('?', 1)[0]
    if (rawPath === '') {
      if (hrefParts.length === 2 && hrefParts[1] !== '') {
        // <lang><zh-CN>fragment 为空路径时指向当前页，使用已读取的正文直接验证。</zh-CN><en>An empty path refers to the current page, so its fragment is checked against the already-loaded content.</en></lang>
        let currentFragment
        try {
          currentFragment = decodeURIComponent(hrefParts[1])
        } catch {
          throw new Error(`Guide link has invalid fragment encoding: ${relativePage}`)
        }
        assertFragmentTarget(content, currentFragment, relativePage)
      }
      continue
    }
    // <lang><zh-CN>decodedPath 对 percent-encoding 作浏览器一致的本地解码，坏编码 fail closed。</zh-CN><en>DecodedPath applies browser-consistent local percent decoding; malformed encoding fails closed.</en></lang>
    let decodedPath
    try {
      decodedPath = decodeURIComponent(rawPath)
    } catch {
      throw new Error(`Guide link has invalid URL encoding: ${relativePage}`)
    }
    // <lang><zh-CN>targetPath 解析目录 route 到其 index.html，其余路径作为普通本地文件处理。</zh-CN><en>TargetPath maps directory routes to index.html and treats other paths as ordinary local files.</en></lang>
    const targetPath = path.resolve(path.dirname(pagePath), decodedPath)
    const rootedTarget =
      decodedPath.endsWith('/') || decodedPath === '.'
        ? path.join(targetPath, 'index.html')
        : targetPath
    assertChildPath(publicRoot, rootedTarget, 'Guide link')
    if (!fs.existsSync(rootedTarget) || !fs.statSync(rootedTarget).isFile()) {
      throw new Error(`Guide link target is missing: ${relativePage}`)
    }

    if (hrefParts.length === 2 && hrefParts[1] !== '') {
      // <lang><zh-CN>targetText 仅在有 fragment 时读取，避免为纯导航重复载入文件。</zh-CN><en>TargetText is read only when a fragment is present, avoiding duplicate reads for plain navigation.</en></lang>
      const targetText = fs.readFileSync(rootedTarget, 'utf8')
      // <lang><zh-CN>fragment 匹配 id/name 属性；已解码并转交统一 helper 检查。</zh-CN><en>Fragment matches id/name attributes after decoding and is passed to the shared checker.</en></lang>
      let fragment
      try {
        fragment = decodeURIComponent(hrefParts[1])
      } catch {
        throw new Error(`Guide link has invalid fragment encoding: ${relativePage}`)
      }
      assertFragmentTarget(targetText, fragment, relativePage)
    }
  }
}

/**
 * <lang><zh-CN>将新独立 guide route 物化到 public artifact，并建立默认首页入口。</lang><en>Materializes the independent guide route in the public artifact and adds an entry to the default landing page.</en></lang>
 *
 * @param {{repositoryRoot:string,publicRoot:string}} options <lang><zh-CN>BP 仓根目录与已生成 public artifact 根目录。</zh-CN><en>BP repository root and generated public artifact root.</en></lang>
 * @returns {Object} <lang><zh-CN>写入 publication manifest 的 public-safe 附加范围记录。</zh-CN><en>Public-safe additive-scope record for the publication manifest.</en></lang>
 * @throws {Error} <lang><zh-CN>源树不完整、超出路径边界、隐私/资源检查失败或首页锚点缺失时抛出。</zh-CN><en>Thrown when the source tree is incomplete, path boundaries fail, privacy/resource checks fail, or the landing insertion point is missing.</en></lang>
 * @lang zh-CN 本函数只向 public artifact 新建固定 route，不改 baseline B 首页/API 内容；首页仅增加 opt-in 双语指南卡。
 * @lang en This function creates one fixed route in the public artifact and leaves baseline B landing/API content intact; the landing receives only an opt-in bilingual guide card.
 */
export function materializePreferenceGuide({ repositoryRoot, publicRoot }) {
  // <lang><zh-CN>repositoryPath 和 artifactPath 都标准化为本地绝对目录，供下方统一做边界验证。</zh-CN><en>RepositoryPath and artifactPath are normalized as local absolute directories for consistent boundary checks below.</en></lang>
  const repositoryPath = path.resolve(repositoryRoot)
  const artifactPath = path.resolve(publicRoot)
  // <lang><zh-CN>sourceRoot 由固定文档路径构造，调用方不能指定任意源目录。</zh-CN><en>SourceRoot comes from a fixed documentation path; callers cannot select an arbitrary source directory.</en></lang>
  const sourceRoot = path.resolve(repositoryPath, GUIDE_SOURCE_PATH)
  // <lang><zh-CN>destinationRoot 是唯一新增的公开目录，不覆盖默认 Portal 路由。</zh-CN><en>DestinationRoot is the only added public directory and does not replace default Portal routes.</en></lang>
  const destinationRoot = path.resolve(artifactPath, ...GUIDE_PUBLIC_ROUTE.split('/'))
  assertChildPath(repositoryPath, sourceRoot, 'Guide source')
  assertChildPath(artifactPath, destinationRoot, 'Guide output')

  // <lang><zh-CN>sourceBodies 在复制前整体检查固定 allowlist，不枚举或递归读取旁边的内部文件。</zh-CN><en>SourceBodies validates the fixed allowlist before copying and never enumerates or recursively reads adjacent internal files.</en></lang>
  const sourceBodies = new Map()
  for (const relativeFile of GUIDE_SOURCE_FILES) {
    // <lang><zh-CN>sourceFile 只来自源码 allowlist，路径分隔符在 Windows/Unix 间稳定。</zh-CN><en>SourceFile comes only from the source allowlist and uses portable separators across Windows and Unix.</en></lang>
    const sourceFile = path.resolve(sourceRoot, ...relativeFile.split('/'))
    assertChildPath(sourceRoot, sourceFile, 'Guide source file')
    sourceBodies.set(relativeFile, readValidatedGuideSource(sourceFile, relativeFile))
  }

  if (fs.existsSync(destinationRoot)) {
    throw new Error('Additive guide route already exists in the public artifact.')
  }
  fs.mkdirSync(destinationRoot, { recursive: true })
  for (const relativeFile of GUIDE_SOURCE_FILES) {
    // <lang><zh-CN>destinationFile 保持 allowlist 相对路径，防止页面和样式互相覆盖。</zh-CN><en>DestinationFile preserves the allowlisted relative path so pages and styles cannot overwrite one another.</en></lang>
    const destinationFile = path.resolve(destinationRoot, ...relativeFile.split('/'))
    assertChildPath(destinationRoot, destinationFile, 'Guide output file')
    fs.mkdirSync(path.dirname(destinationFile), { recursive: true })
    // <lang><zh-CN>writeFileSync 写入此前已检查的固定 allowlist 正文，不执行模板、脚本或压缩。</zh-CN><en>WriteFileSync writes the previously validated allowlisted content without rendering templates, running scripts, or minifying it.</en></lang>
    fs.writeFileSync(destinationFile, sourceBodies.get(relativeFile), 'utf8')
  }

  // <lang><zh-CN>landingPath 是默认 Portal 的根首页；只允许唯一已确认 provenance section 作为稳定插入锚点。</zh-CN><en>LandingPath is the default Portal root page; only its unique confirmed provenance section is accepted as the insertion anchor.</en></lang>
  const landingPath = path.join(artifactPath, 'index.html')
  let landingHtml = fs.readFileSync(landingPath, 'utf8')
  // <lang><zh-CN>guideEntryId 固定标识本次双语入口，重复执行或入口重叠时 fail closed。</zh-CN><en>GuideEntryId is the stable identity of this bilingual entry and fails closed on duplicate execution or overlap.</en></lang>
  const guideEntryId = 'hia-public-preference-guide'
  if (landingHtml.includes(`id="${guideEntryId}"`)) {
    throw new Error('Default Portal already contains the preference-guide entry.')
  }
  const provenanceStart = landingHtml.indexOf('<section aria-labelledby="hia-public-provenance"')
  if (provenanceStart < 0 || landingHtml.indexOf('<section aria-labelledby="hia-public-provenance"', provenanceStart + 1) >= 0) {
    throw new Error('Default Portal lacks one stable provenance section for guide navigation.')
  }
  // <lang><zh-CN>guideEntry 双语并列链接不依赖 JS locale runtime，无脚本时也能选择对应页面。</lang><en>GuideEntry presents both locale links without depending on the JS locale runtime, so readers can choose either page without scripts.</en></lang>
  const guideEntry = `<section id="${guideEntryId}" aria-labelledby="hia-public-preference-guide-title"><h2 id="hia-public-preference-guide-title">应用指南 / Integration guides</h2><p>按任务阅读访客语言与主题偏好流程；内容中的属性值均为说明模型。 / Follow the visitor language and theme preference flow; example attributes are illustrative only.</p><div class="hia-public-card-grid"><a class="hia-public-card" href="${GUIDE_PUBLIC_ROUTE}"><strong>访客语言与主题偏好</strong><p>中文指南：按步骤实现、恢复与清除显示偏好。</p></a><a class="hia-public-card" href="${GUIDE_PUBLIC_ROUTE}index.en.html" lang="en" hreflang="en"><strong>Visitor language and theme preferences</strong><p>English guide: implement, restore, and reset display preferences.</p></a></div></section>`
  landingHtml = `${landingHtml.slice(0, provenanceStart)}${guideEntry}${landingHtml.slice(provenanceStart)}`
  fs.writeFileSync(landingPath, landingHtml, 'utf8')

  // <lang><zh-CN>只验证本次新增的首页入口片段，避免把 baseline B 既有应用链接策略纳入 guide 校验边界。</zh-CN><en>Validate only the newly added landing-entry fragment so baseline B's existing application-link policy stays outside the guide validation boundary.</en></lang>
  validateLocalLinks(artifactPath, 'index.html', guideEntry)
  // <lang><zh-CN>htmlFiles 只列出新增 route 的六个页面；统一验证其回链、API 索引和 fragment 均在 Pages artifact 中可达。</zh-CN><en>HtmlFiles lists only the six pages on the added route and validates that their return links, API index, and fragments resolve in the Pages artifact.</en></lang>
  const htmlFiles = GUIDE_SOURCE_FILES.filter((relativeFile) => relativeFile.endsWith('.html')).map(
    (relativeFile) => `${GUIDE_PUBLIC_ROUTE}${relativeFile}`
  )
  for (const relativePage of htmlFiles) {
    // <lang><zh-CN>pageContent 从构建产物读取，验证实际发布路径而不是只检查源树路径。</zh-CN><en>PageContent is read from the generated artifact so validation covers actual published routes rather than source-only paths.</en></lang>
    const pageContent = fs.readFileSync(
      path.resolve(artifactPath, ...relativePage.split('/')),
      'utf8'
    )
    validateLocalLinks(artifactPath, relativePage, pageContent)
  }

  return {
    baselineId: GUIDE_BASELINE_ID,
    version: GUIDE_BASELINE_VERSION,
    relationship: 'additive-independent-guide',
    route: GUIDE_PUBLIC_ROUTE,
    locales: ['zh-CN', 'en'],
    pages: [
      'index.html',
      'index.en.html',
      'guides/preferences.html',
      'guides/preferences.en.html',
      'guides/troubleshooting.html',
      'guides/troubleshooting.en.html'
    ],
    pageCount: 6,
    staticAssetCount: 1,
    externalResources: false,
    analytics: false,
    productionBehaviorObserved: false,
    businessSystemAdoption: false
  }
}

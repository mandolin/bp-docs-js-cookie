/**
 * <lang><zh-CN>生成 bp-docs-js-cookie 的 27-profile 静态展示入口与 public-safe manifest。</zh-CN><en>Generates the 27-profile static showcase hub and public-safe manifest for bp-docs-js-cookie.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-hub
 * @lang zh-CN hub 只提供 profile 发现与过滤，不复制 owner 的渲染、源码阅读或主题切换实现。
 * @lang en The hub only provides profile discovery and filtering; it does not duplicate owner rendering, source reading, or theme switching.
 */

import {
  DEFAULT_SHOWCASE_PROFILE_ID,
  OWNER_COMMITS,
  OUTPUT_PIPELINES,
  SHOWCASE_SKINS,
  SOURCE_READING_MODES
} from './config.mjs'

/** @lang zh-CN pipeline 的中英双语公开标签。 @lang en Public bilingual labels for pipelines. */
const PIPELINE_LABELS = Object.freeze({
  'jphs-jth-native': 'JPHS + JTH 独立输出 / Native output',
  'hia-jsdoc': 'hia-jsdoc 独立与桥接 / Standalone + bridge',
  'unified-portal': '统一 Portal / Unified Portal'
})

/** @lang zh-CN surface 的中英双语公开标签。 @lang en Public bilingual labels for surfaces. */
const SURFACE_LABELS = Object.freeze({
  standalone: '独立输出 / Standalone',
  'portal-bridge': 'Portal 桥接 / Portal bridge',
  portal: 'Portal 输出 / Portal output'
})

/**
 * <lang><zh-CN>转义进入 HTML 文本或属性的闭集字符串。</zh-CN><en>Escapes closed-set strings entering HTML text or attributes.</en></lang>
 *
 * @param {unknown} value <lang><zh-CN>待转义的公开标量。</zh-CN><en>Public scalar to escape.</en></lang>
 * @returns {string} <lang><zh-CN>HTML-safe 文本。</zh-CN><en>HTML-safe text.</en></lang>
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * <lang><zh-CN>创建不含路径、正文、credential 或 runtime identity 的公开矩阵 manifest。</zh-CN><en>Creates a public matrix manifest without paths, bodies, credentials, or runtime identity.</en></lang>
 *
 * @param {{buildCommit: string, profiles: Array<Object>}} input <lang><zh-CN>当前 BP commit 与冻结 profile 集合。</zh-CN><en>Current BP commit and frozen profile set.</en></lang>
 * @returns {Object} <lang><zh-CN>可公开部署的矩阵 manifest。</zh-CN><en>Matrix manifest safe for public deployment.</en></lang>
 * @throws {TypeError} <lang><zh-CN>commit 或 profiles 不符合闭集时 fail closed。</zh-CN><en>Fails closed when the commit or profiles violate the closed set.</en></lang>
 */
export function createShowcaseManifest({ buildCommit, profiles }) {
  if (!/^[0-9a-f]{40}$/u.test(buildCommit)) {
    throw new TypeError(
      'Showcase buildCommit must be a full lowercase Git SHA.'
    )
  }
  if (!Array.isArray(profiles) || profiles.length !== 27) {
    throw new TypeError('Showcase manifest requires exactly 27 profiles.')
  }
  // <lang><zh-CN>surface count 独立于 profile count，明确 hia-jsdoc 的双 surface 展开。</zh-CN><en>The surface count is independent from the profile count and makes the hia-jsdoc dual-surface expansion explicit.</en></lang>
  const surfaceCount = profiles.reduce(
    (count, profile) => count + profile.surfaces.length,
    0
  )

  return {
    contract: 'bp-documentation-showcase-matrix',
    contractVersion: '0.1.0-draft',
    project: 'bp-docs-js-cookie',
    upstream: 'js-cookie@3.0.8',
    buildCommit,
    owners: OWNER_COMMITS,
    defaultProfileId: DEFAULT_SHOWCASE_PROFILE_ID,
    profileCount: profiles.length,
    surfaceCount,
    dimensions: {
      pipelines: OUTPUT_PIPELINES,
      sourceModes: SOURCE_READING_MODES,
      skins: SHOWCASE_SKINS,
      pageMode: 'multi-page'
    },
    profiles
  }
}

/**
 * <lang><zh-CN>把一个 profile 渲染为无脚本可访问的静态卡片。</zh-CN><en>Renders one profile as a no-script-accessible static card.</en></lang>
 *
 * @param {Object} profile <lang><zh-CN>public-safe profile。</zh-CN><en>Public-safe profile.</en></lang>
 * @returns {string} <lang><zh-CN>一个 article HTML fragment。</zh-CN><en>One article HTML fragment.</en></lang>
 */
function renderProfileCard(profile) {
  // <lang><zh-CN>每个 surface 使用独立链接，避免 hia-jsdoc bridge 被隐藏在脚本交互后。</zh-CN><en>Each surface uses a separate link so the hia-jsdoc bridge is not hidden behind scripted interaction.</en></lang>
  const surfaceLinks = profile.surfaces
    .map(
      (surface) =>
        `<a class="surface-link" data-showcase-surface="${escapeHtml(surface.kind)}" href="${escapeHtml(surface.path)}">${escapeHtml(SURFACE_LABELS[surface.kind] ?? surface.kind)}</a>`
    )
    .join('')
  // <lang><zh-CN>默认徽标只由冻结 identity 决定，不依赖列表位置。</zh-CN><en>The default badge is determined only by the frozen identity, not list position.</en></lang>
  const defaultBadge = profile.isDefault
    ? '<span class="default-badge">默认 / Default</span>'
    : ''

  return `<article class="profile-card" data-showcase-profile="${escapeHtml(profile.id)}" data-pipeline="${escapeHtml(profile.pipeline)}" data-source-mode="${escapeHtml(profile.sourceMode)}" data-skin="${escapeHtml(profile.skin)}">
  <div class="card-heading">${defaultBadge}<span class="profile-id">${escapeHtml(profile.id)}</span></div>
  <h2>${escapeHtml(PIPELINE_LABELS[profile.pipeline] ?? profile.pipeline)}</h2>
  <dl><div><dt>页面 / Pages</dt><dd>multi-page</dd></div><div><dt>源码 / Source</dt><dd>${escapeHtml(profile.sourceMode)}</dd></div><div><dt>皮肤 / Skin</dt><dd>${escapeHtml(profile.skin)}</dd></div></dl>
  <div class="surface-links">${surfaceLinks}</div>
</article>`
}

/**
 * <lang><zh-CN>渲染公开展示 hub；关闭 JavaScript 时 36 个 surface 链接仍全部存在。</zh-CN><en>Renders the public showcase hub; all 36 surface links remain present when JavaScript is disabled.</en></lang>
 *
 * @param {Object} manifest <lang><zh-CN>由 createShowcaseManifest 创建的公开矩阵。</zh-CN><en>Public matrix created by createShowcaseManifest.</en></lang>
 * @returns {string} <lang><zh-CN>完整 UTF-8 HTML 文档。</zh-CN><en>Complete UTF-8 HTML document.</en></lang>
 */
export function renderShowcaseHub(manifest) {
  // <lang><zh-CN>静态 cards 是 canonical 内容；showcase.js 只做渐进式过滤。</zh-CN><en>Static cards are canonical content; showcase.js only adds progressive filtering.</en></lang>
  const cards = manifest.profiles.map(renderProfileCard).join('\n')
  // <lang><zh-CN>默认入口直接指向 Portal/fetch/classic，符合 W-P118 的默认阅读策略。</zh-CN><en>The default entry points directly to Portal/fetch/classic, matching W-P118's default reading policy.</en></lang>
  const defaultProfile = manifest.profiles.find(
    (profile) => profile.id === manifest.defaultProfileId
  )
  const defaultSurface = defaultProfile?.surfaces[0]?.path
  if (!defaultSurface) {
    throw new TypeError('Showcase manifest lacks the default profile surface.')
  }

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
  <title>bp-docs-js-cookie 文档工程展示 / Documentation Showcase</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/showcase.css">
</head>
<body>
  <header class="hero">
    <p class="eyebrow">HIA-Documentation-Sys · Best-practice documentation engineering</p>
    <h1>bp-docs-js-cookie 文档工程展示</h1>
    <p>同一份注释与代码，经三条输出链、三种源码阅读模式和三套皮肤形成 27 个 profile。文档化服务于人和 AI；本页展示的是可复现工程结果，而非 js-cookie 上游官方文档。</p>
    <p class="hero-actions"><a class="primary-link" href="${escapeHtml(defaultSurface)}">进入默认展示 / Open default</a><a href="showcase-matrix.json">查看矩阵 manifest / View manifest</a></p>
  </header>
  <main>
    <section class="matrix-summary" aria-labelledby="matrix-title">
      <div><p class="metric">${manifest.profileCount}</p><p>配置 profiles</p></div>
      <div><p class="metric">${manifest.surfaceCount}</p><p>可浏览 surfaces</p></div>
      <div><p class="metric">3 × 3 × 3</p><p>输出链 × 源码模式 × 皮肤</p></div>
    </section>
    <section class="filters" aria-labelledby="matrix-title">
      <h2 id="matrix-title">展示矩阵 / Showcase matrix</h2>
      <label>输出链 / Pipeline<select data-filter="pipeline"><option value="">全部 / All</option>${OUTPUT_PIPELINES.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(PIPELINE_LABELS[value])}</option>`).join('')}</select></label>
      <label>源码 / Source<select data-filter="sourceMode"><option value="">全部 / All</option>${SOURCE_READING_MODES.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label>
      <label>皮肤 / Skin<select data-filter="skin"><option value="">全部 / All</option>${SHOWCASE_SKINS.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}</select></label>
      <p class="result-count" aria-live="polite"><span data-result-count>${manifest.profileCount}</span> profiles</p>
      <noscript><p>JavaScript 已关闭；全部 profile 与 surface 链接仍按静态列表显示。 / JavaScript is disabled; every profile and surface remains available in the static list.</p></noscript>
    </section>
    <section class="profile-grid" aria-label="Documentation profiles">${cards}</section>
  </main>
  <footer><p>Source revision <code>${escapeHtml(manifest.buildCommit)}</code> · owners pinned by full commit.</p></footer>
  <script src="assets/showcase.js" defer></script>
</body>
</html>
`
}

/** @lang zh-CN hub 专属静态样式，不进入任何 owner 主题包。 @lang en Hub-only static styles that do not enter any owner theme package. */
export const SHOWCASE_HUB_CSS = `/* 中文：hub 采用高可读、自适应布局；profile 内部视觉仍由各 owner skin 负责。 English: The hub uses a readable adaptive layout; owner skins remain responsible for profile visuals. */
:root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f5f7fb;color:#18202d}*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#eef5ff 0,#f8f5ee 52%,#f3f5f9 100%);color:#18202d}.hero,main,footer{width:min(1180px,calc(100% - 32px));margin-inline:auto}.hero{padding:64px 0 34px}.eyebrow{font-size:.82rem;letter-spacing:.08em;text-transform:uppercase;color:#43546b}.hero h1{max-width:820px;margin:.35rem 0 1rem;font-size:clamp(2.2rem,6vw,4.6rem);line-height:1.02}.hero>p:not(.eyebrow):not(.hero-actions){max-width:780px;font-size:1.08rem;line-height:1.75}.hero-actions,.surface-links{display:flex;flex-wrap:wrap;gap:10px}.hero a,.surface-link{display:inline-flex;align-items:center;min-height:42px;padding:9px 14px;border:1px solid #9aa8ba;border-radius:10px;color:#15304e;text-decoration:none;background:#fff}.hero a:hover,.surface-link:hover{border-color:#225ea8;box-shadow:0 4px 14px #2b5f9222}.hero .primary-link{background:#153f70;color:#fff;border-color:#153f70}.matrix-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:24px}.matrix-summary>div,.filters,.profile-card{border:1px solid #ced7e2;border-radius:16px;background:#ffffffd9;box-shadow:0 10px 34px #384b6314}.matrix-summary>div{padding:20px}.matrix-summary p{margin:.15rem 0}.metric{font-size:2rem;font-weight:760}.filters{display:flex;flex-wrap:wrap;gap:14px;align-items:end;padding:20px;margin-bottom:20px}.filters h2{flex-basis:100%;margin:0}.filters label{display:grid;gap:6px;font-size:.88rem;font-weight:650}.filters select{min-width:180px;padding:9px;border:1px solid #9caabd;border-radius:8px;background:#fff;color:#18202d}.result-count{margin:0 0 9px auto}.profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(285px,1fr));gap:16px}.profile-card{padding:18px}.profile-card[hidden]{display:none}.card-heading{display:flex;gap:8px;align-items:center;min-height:24px}.profile-id{font:600 .76rem/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:#4d5d70;overflow-wrap:anywhere}.default-badge{padding:3px 7px;border-radius:999px;background:#e3f1dd;color:#254f20;font-size:.72rem;white-space:nowrap}.profile-card h2{font-size:1.12rem;margin:.8rem 0}.profile-card dl{display:grid;gap:7px;margin:0 0 16px}.profile-card dl div{display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px}.profile-card dt{color:#596a80}.profile-card dd{margin:0;font-weight:650}.surface-link{font-size:.9rem}footer{padding:34px 0 52px;color:#536277;overflow-wrap:anywhere}@media(max-width:680px){.hero{padding-top:38px}.matrix-summary{grid-template-columns:1fr}.filters{align-items:stretch}.filters label,.filters select{width:100%}.result-count{margin:0}.profile-grid{grid-template-columns:1fr}}@media(prefers-color-scheme:dark){:root{background:#111821;color:#e9eff7}body{background:linear-gradient(145deg,#101a26,#1b1917 52%,#111821);color:#e9eff7}.eyebrow,.profile-id,footer{color:#aebdd0}.matrix-summary>div,.filters,.profile-card{background:#17212ddd;border-color:#344456}.hero a,.surface-link,.filters select{background:#192635;color:#eaf2fb;border-color:#52657a}.hero .primary-link{background:#8cbbe8;color:#102238;border-color:#8cbbe8}.profile-card dt{color:#adbed2}.default-badge{background:#294725;color:#d8f5ce}}
`

/** @lang zh-CN hub 的渐进式三维过滤器；删除或禁用该脚本不影响链接可达性。 @lang en Progressive three-dimensional hub filter; removing or disabling it does not affect link reachability. */
export const SHOWCASE_HUB_JS = `/* 中文：只根据闭集 data attributes 过滤静态卡片。 English: Filter static cards only by closed-set data attributes. */
(() => {
  'use strict'
  const controls = [...document.querySelectorAll('[data-filter]')]
  const cards = [...document.querySelectorAll('[data-showcase-profile]')]
  const count = document.querySelector('[data-result-count]')
  const applyFilters = () => {
    const selected = Object.fromEntries(controls.map((control) => [control.dataset.filter, control.value]))
    let visible = 0
    for (const card of cards) {
      const matches = (!selected.pipeline || card.dataset.pipeline === selected.pipeline)
        && (!selected.sourceMode || card.dataset.sourceMode === selected.sourceMode)
        && (!selected.skin || card.dataset.skin === selected.skin)
      card.hidden = !matches
      if (matches) visible += 1
    }
    if (count) count.textContent = String(visible)
  }
  for (const control of controls) control.addEventListener('change', applyFilters)
})()
`

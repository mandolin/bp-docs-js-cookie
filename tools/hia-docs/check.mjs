/**
 * <lang><zh-CN>离线验证 bp-docs-js-cookie 的 27-profile、36-surface 展示矩阵。</zh-CN><en>Offline-validates the 27-profile, 36-surface showcase matrix for bp-docs-js-cookie.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-check
 * @lang zh-CN checker 只读取 BP Git 元数据与 ignored 生成树，不访问网络、credential、目标仓库或浏览器。
 * @lang en The checker reads only BP Git metadata and the ignored generated tree; it accesses no network, credentials, target repository, or browser.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_SHOWCASE_PROFILE_ID,
  DOCUMENTATION_NODE_VERSIONS,
  OWNER_COMMITS,
  SHOWCASE_SKINS,
  SOURCE_READING_MODES,
  createShowcaseProfiles,
  resolveTopology
} from './config.mjs'
import { isAbsolutePathLike } from './sanitize.mjs'

/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)
/** @lang zh-CN 当前 checker 使用的 generated topology。 @lang en Generated topology used by the current checker. */
const topology = resolveTopology(repositoryRoot)
/** @lang zh-CN JSON 中绝不允许出现的 raw/runtime carrier key。 @lang en Raw/runtime carrier keys forbidden from public JSON. */
const BLOCKED_JSON_KEYS = new Set([
  'comment',
  'filePath',
  'filename',
  'pathAbsolute',
  'primaryBlock',
  'sourceContent',
  'sourcePrimaryBlock',
  'sourcesContent'
])
/** @lang zh-CN embed topic 中必须出现而 index/JSON 中不得出现的源码哨兵。 @lang en Source sentinel required in embed topics and forbidden from indexes/JSON. */
const SOURCE_BODY_SENTINEL =
  'attributes = assign({}, defaultAttributes, attributes)'

/**
 * <lang><zh-CN>断言离线验收条件。</zh-CN><en>Asserts an offline acceptance condition.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为真的值。</zh-CN><en>Value that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>public-safe 失败说明。</zh-CN><en>Public-safe failure message.</en></lang>
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * <lang><zh-CN>读取并解析一个 UTF-8 JSON 文件。</zh-CN><en>Reads and parses one UTF-8 JSON file.</en></lang>
 *
 * @param {string} filePath <lang><zh-CN>绝对文件路径。</zh-CN><en>Absolute file path.</en></lang>
 * @returns {Object} <lang><zh-CN>已解析对象。</zh-CN><en>Parsed object.</en></lang>
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/**
 * <lang><zh-CN>把 profile surface route 安全解析到 showcase tree。</zh-CN><en>Safely resolves a profile surface route inside the showcase tree.</en></lang>
 *
 * @param {string} relativeRoute <lang><zh-CN>manifest 中的相对 route。</zh-CN><en>Relative route from the manifest.</en></lang>
 * @returns {string} <lang><zh-CN>showcase 内绝对路径。</zh-CN><en>Absolute path inside the showcase.</en></lang>
 */
function resolveSurfaceRoot(relativeRoute) {
  const candidate = path.resolve(topology.showcaseRoot, relativeRoute)
  const boundary = path.relative(topology.showcaseRoot, candidate)
  assert(
    boundary && !boundary.startsWith('..') && !path.isAbsolute(boundary),
    `Surface route escaped the showcase root: ${relativeRoute}`
  )
  return candidate
}

/**
 * <lang><zh-CN>确定性枚举普通文件，并拒绝 symbolic link。</zh-CN><en>Deterministically enumerates regular files and rejects symbolic links.</en></lang>
 *
 * @param {string} root <lang><zh-CN>待枚举根。</zh-CN><en>Root to enumerate.</en></lang>
 * @returns {string[]} <lang><zh-CN>按 code-point 相对路径排序的绝对文件。</zh-CN><en>Absolute files sorted by code-point relative path.</en></lang>
 */
function listFiles(root) {
  const files = []
  /**
   * <lang><zh-CN>递归访问当前目录。</zh-CN><en>Recursively visits the current directory.</en></lang>
   *
   * @param {string} current <lang><zh-CN>当前绝对目录。</zh-CN><en>Current absolute directory.</en></lang>
   * @returns {void}
   */
  const visit = (current) => {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0
      )
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      const status = fs.lstatSync(entryPath)
      assert(
        !status.isSymbolicLink(),
        'Showcase output contains a symbolic link.'
      )
      if (status.isDirectory()) visit(entryPath)
      else if (status.isFile()) files.push(entryPath)
    }
  }
  visit(root)
  return files.sort((left, right) => {
    const leftPath = path.relative(root, left).replaceAll('\\', '/')
    const rightPath = path.relative(root, right).replaceAll('\\', '/')
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0
  })
}

/**
 * <lang><zh-CN>重算公开树聚合指纹。</zh-CN><en>Recomputes the public-tree aggregate fingerprint.</en></lang>
 *
 * @param {string[]} files <lang><zh-CN>确定性文件序列。</zh-CN><en>Deterministic file sequence.</en></lang>
 * @returns {{fileCount:number,totalBytes:number,sha256:string}} <lang><zh-CN>无正文摘要。</zh-CN><en>Body-free summary.</en></lang>
 */
function fingerprintFiles(files) {
  const digest = crypto.createHash('sha256')
  let totalBytes = 0
  for (const filePath of files) {
    const body = fs.readFileSync(filePath)
    const relativePath = path
      .relative(topology.showcaseRoot, filePath)
      .replaceAll('\\', '/')
    const sha256 = crypto.createHash('sha256').update(body).digest('hex')
    totalBytes += body.byteLength
    digest.update(`${relativePath}\0${body.byteLength}\0${sha256}\n`, 'utf8')
  }
  return {
    fileCount: files.length,
    totalBytes,
    sha256: digest.digest('hex')
  }
}

/**
 * <lang><zh-CN>递归检查公开 JSON 的 blocked key 与绝对路径。</zh-CN><en>Recursively checks public JSON for blocked keys and absolute paths.</en></lang>
 *
 * @param {unknown} value <lang><zh-CN>当前 JSON 值。</zh-CN><en>Current JSON value.</en></lang>
 * @param {string} label <lang><zh-CN>诊断用相对文件名。</zh-CN><en>Relative filename for diagnostics.</en></lang>
 * @returns {void}
 */
function checkJsonPrivacy(value, label) {
  if (Array.isArray(value)) {
    for (const item of value) checkJsonPrivacy(item, label)
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      assert(
        !BLOCKED_JSON_KEYS.has(key) && !/filePath$/iu.test(key),
        `${label} contains blocked JSON key ${key}.`
      )
      checkJsonPrivacy(item, label)
    }
    return
  }
  assert(!isAbsolutePathLike(value), `${label} contains an absolute path.`)
}

/**
 * <lang><zh-CN>从 presentation profile 投影跨 variant 必须稳定的 identity set。</zh-CN><en>Projects the identity set that must remain stable across presentation variants.</en></lang>
 *
 * @param {Object} presentation <lang><zh-CN>中性 presentation profile。</zh-CN><en>Neutral presentation profile.</en></lang>
 * @returns {string} <lang><zh-CN>确定性 identity JSON。</zh-CN><en>Deterministic identity JSON.</en></lang>
 */
function projectIdentitySet(presentation) {
  const topics = presentation.pagePartition?.topics ?? []
  return JSON.stringify(
    topics.map((topic) => ({
      topicId: topic.topicId,
      pageId: topic.pageId,
      fragmentId: topic.fragmentId,
      navigationId: topic.navigationId,
      relationIds: topic.relationIds
    }))
  )
}

/**
 * <lang><zh-CN>读取 surface 的可见 HTML 集合。</zh-CN><en>Reads the visible HTML set for a surface.</en></lang>
 *
 * @param {string[]} files <lang><zh-CN>surface 普通文件。</zh-CN><en>Regular files in the surface.</en></lang>
 * @returns {string} <lang><zh-CN>仅用于离线断言的组合 HTML。</zh-CN><en>Combined HTML used only for offline assertions.</en></lang>
 */
function readCombinedHtml(files) {
  return files
    .filter((filePath) => filePath.endsWith('.html'))
    .map((filePath) => fs.readFileSync(filePath, 'utf8'))
    .join('\n')
}

/**
 * <lang><zh-CN>验证一个 owner surface 的多页、主题、源码载体和 identity。</zh-CN><en>Validates one owner surface's multi-page mode, theme, source carrier, and identity.</en></lang>
 *
 * @param {Object} profile <lang><zh-CN>矩阵 profile。</zh-CN><en>Matrix profile.</en></lang>
 * @param {Object} surface <lang><zh-CN>profile surface。</zh-CN><en>Profile surface.</en></lang>
 * @param {Map<string,string>} identityByGroup <lang><zh-CN>跨 variant identity 基线。</zh-CN><en>Cross-variant identity baselines.</en></lang>
 * @returns {{fileCount:number,topicCount:number,assetCount:number}} <lang><zh-CN>无正文验收摘要。</zh-CN><en>Body-free acceptance summary.</en></lang>
 */
function checkSurface(profile, surface, identityByGroup) {
  const root = resolveSurfaceRoot(surface.path)
  const indexPath = path.join(root, 'index.html')
  const presentationPath = path.join(
    root,
    'documentation-presentation-profile.json'
  )
  assert(
    fs.existsSync(indexPath),
    `${profile.id}/${surface.kind} lacks index.html.`
  )
  assert(
    fs.existsSync(presentationPath),
    `${profile.id}/${surface.kind} lacks presentation profile.`
  )
  const files = listFiles(root)
  const indexHtml = fs.readFileSync(indexPath, 'utf8')
  const combinedHtml = readCombinedHtml(files)
  const presentation = readJson(presentationPath)
  const expectedSkin =
    surface.kind === 'standalone' ? profile.skin : profile.portalSkin

  assert(
    presentation.contract === 'documentation-presentation-profile',
    `${profile.id}/${surface.kind} has the wrong presentation contract.`
  )
  assert(
    presentation.pagePartition?.mode === 'multi-page',
    `${profile.id}/${surface.kind} is not multi-page.`
  )
  assert(
    presentation.source?.mode === profile.sourceMode,
    `${profile.id}/${surface.kind} source mode drifted.`
  )
  assert(
    presentation.theme?.skinId === expectedSkin,
    `${profile.id}/${surface.kind} skin drifted.`
  )
  assert(
    presentation.theme?.scheme === 'system',
    `${profile.id}/${surface.kind} scheme drifted.`
  )
  assert(
    presentation.theme?.skins?.length === 3,
    `${profile.id}/${surface.kind} lacks the three-skin catalog.`
  )
  assert(
    presentation.pagePartition?.topics?.length === 18,
    `${profile.id}/${surface.kind} topic count drifted.`
  )
  assert(
    presentation.source?.assets?.length === 18,
    `${profile.id}/${surface.kind} source-asset identity count drifted.`
  )
  assert(
    indexHtml.includes('<noscript>') || surface.kind === 'standalone',
    `${profile.id}/${surface.kind} lacks a no-script route.`
  )
  assert(
    !indexHtml.includes(SOURCE_BODY_SENTINEL),
    `${profile.id}/${surface.kind} index contains source body.`
  )
  assert(
    (combinedHtml.match(/<details(?:\s|>)/gu) || []).length > 0,
    `${profile.id}/${surface.kind} lacks native disclosure.`
  )

  if (surface.kind === 'standalone') {
    assert(
      indexHtml.includes(`data-hia-skin="${profile.skin}"`),
      `${profile.id} standalone index lacks selected skin.`
    )
    assert(
      indexHtml.includes('data-hia-page-mode="multi-page"'),
      `${profile.id} standalone index lacks multi-page identity.`
    )
    assert(
      indexHtml.includes(`data-hia-source-mode="${profile.sourceMode}"`),
      `${profile.id} standalone index lacks source-mode identity.`
    )
    assert(
      indexHtml.includes('data-hia-skin-select'),
      `${profile.id} standalone lacks the skin selector.`
    )
    for (const skin of SHOWCASE_SKINS) {
      assert(
        indexHtml.includes(`value="${skin}"`),
        `${profile.id} standalone selector lacks ${skin}.`
      )
    }
  } else {
    assert(
      indexHtml.includes('hia-project-split-site'),
      `${profile.id}/${surface.kind} lacks split-site shell.`
    )
    assert(
      indexHtml.includes(`data-hia-skin="${profile.portalSkin}"`),
      `${profile.id}/${surface.kind} lacks selected Portal skin.`
    )
    assert(
      indexHtml.includes('data-hia-skin-control'),
      `${profile.id}/${surface.kind} lacks Portal skin switching.`
    )
    assert(
      fs.existsSync(path.join(root, 'pages', 'index.html')),
      `${profile.id}/${surface.kind} lacks no-script page index.`
    )
  }

  const assets = presentation.source.assets
  const sourceFiles = files.filter((filePath) =>
    /[\\/]sources[\\/][a-f0-9]{64}\.txt$/u.test(filePath)
  )
  if (profile.sourceMode === 'embed') {
    assert(
      assets.every((asset) => asset.relativeUrl === undefined),
      `${profile.id}/${surface.kind} embed profile exposes asset URLs.`
    )
    assert(
      sourceFiles.length === 0,
      `${profile.id}/${surface.kind} embed profile emitted source files.`
    )
    assert(
      combinedHtml.includes(SOURCE_BODY_SENTINEL),
      `${profile.id}/${surface.kind} embed topic lacks source body.`
    )
  } else {
    assert(
      assets.every((asset) =>
        /^sources\/[a-f0-9]{64}\.txt$/u.test(asset.relativeUrl)
      ),
      `${profile.id}/${surface.kind} lacks content-addressed source URLs.`
    )
    assert(
      sourceFiles.length > 0,
      `${profile.id}/${surface.kind} lacks source assets.`
    )
    for (const asset of assets) {
      assert(
        fs.existsSync(path.join(root, asset.relativeUrl)),
        `${profile.id}/${surface.kind} references a missing source asset.`
      )
    }
    assert(
      combinedHtml.includes(SOURCE_BODY_SENTINEL) === false,
      `${profile.id}/${surface.kind} non-embed HTML contains source body.`
    )
    if (profile.sourceMode === 'fetch') {
      assert(
        combinedHtml.includes('data-hia-source-fetch=') ||
          combinedHtml.includes('data-hia-source-reader'),
        `${profile.id}/${surface.kind} lacks fetch readers.`
      )
    } else {
      assert(
        combinedHtml.includes('href="sources/') ||
          combinedHtml.includes('href="../sources/'),
        `${profile.id}/${surface.kind} lacks source links.`
      )
    }
  }

  // <lang><zh-CN>source/skin 变体必须保留同一 topic/page/fragment/navigation/relation identity。</zh-CN><en>Source/skin variants must preserve the same topic/page/fragment/navigation/relation identity.</en></lang>
  const identityGroup = `${profile.pipeline}.${surface.kind}`
  const identitySet = projectIdentitySet(presentation)
  if (identityByGroup.has(identityGroup)) {
    assert(
      identityByGroup.get(identityGroup) === identitySet,
      `${identityGroup} changed stable identity across variants.`
    )
  } else {
    identityByGroup.set(identityGroup, identitySet)
  }

  return {
    fileCount: files.length,
    topicCount: presentation.pagePartition.topics.length,
    assetCount: assets.length
  }
}

/**
 * <lang><zh-CN>执行完整离线矩阵验收并写 ignored evidence。</zh-CN><en>Runs complete offline matrix acceptance and writes ignored evidence.</en></lang>
 *
 * @returns {void}
 */
function main() {
  assert(
    DOCUMENTATION_NODE_VERSIONS.includes(process.versions.node),
    'Checker Node version is outside the documentation support window.'
  )
  assert(
    fs.existsSync(path.join(topology.showcaseRoot, 'index.html')),
    'Showcase hub is missing.'
  )
  assert(
    !fs.existsSync(topology.cacheRoot),
    'Private build cache was not removed.'
  )

  const expectedCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  }).trim()
  const expectedProfiles = createShowcaseProfiles()
  const matrixPath = path.join(topology.showcaseRoot, 'showcase-matrix.json')
  const matrix = readJson(matrixPath)
  const hubHtml = fs.readFileSync(
    path.join(topology.showcaseRoot, 'index.html'),
    'utf8'
  )

  assert(
    matrix.contract === 'bp-documentation-showcase-matrix',
    'Matrix contract drifted.'
  )
  assert(matrix.buildCommit === expectedCommit, 'Matrix build commit drifted.')
  assert(
    matrix.defaultProfileId === DEFAULT_SHOWCASE_PROFILE_ID,
    'Default profile drifted.'
  )
  assert(matrix.profileCount === 27, 'Matrix profile count drifted.')
  assert(matrix.surfaceCount === 36, 'Matrix surface count drifted.')
  assert(
    JSON.stringify(matrix.owners) === JSON.stringify(OWNER_COMMITS),
    'Matrix owner commits drifted.'
  )
  assert(
    JSON.stringify(matrix.profiles) === JSON.stringify(expectedProfiles),
    'Matrix profile expansion drifted.'
  )
  assert(
    (hubHtml.match(/data-showcase-profile=/gu) || []).length === 27,
    'Hub lacks 27 static profile cards.'
  )
  assert(
    (hubHtml.match(/data-showcase-surface=/gu) || []).length === 36,
    'Hub lacks 36 static surface links.'
  )
  assert(hubHtml.includes('<noscript>'), 'Hub lacks no-script explanation.')
  assert(
    !/(?:href|src)="\//u.test(hubHtml),
    'Hub contains a project-unsafe root-absolute asset route.'
  )
  assert(
    hubHtml.includes('href="profiles/unified-portal/fetch/classic/"'),
    'Hub default link is not Portal/fetch/classic.'
  )

  const identityByGroup = new Map()
  const surfaceSummaries = []
  for (const profile of expectedProfiles) {
    for (const surface of profile.surfaces) {
      surfaceSummaries.push({
        profileId: profile.id,
        kind: surface.kind,
        ...checkSurface(profile, surface, identityByGroup)
      })
    }
  }
  assert(surfaceSummaries.length === 36, 'Surface checker count drifted.')
  assert(identityByGroup.size === 4, 'Identity comparison group count drifted.')

  const files = listFiles(topology.showcaseRoot)
  for (const filePath of files) {
    const relativePath = path
      .relative(topology.showcaseRoot, filePath)
      .replaceAll('\\', '/')
    if (filePath.endsWith('.json')) {
      const parsed = readJson(filePath)
      checkJsonPrivacy(parsed, relativePath)
      assert(
        !fs.readFileSync(filePath, 'utf8').includes(SOURCE_BODY_SENTINEL),
        `${relativePath} contains source body.`
      )
    }
    assert(
      !relativePath.includes('/.hia-jsdoc/') &&
        !relativePath.endsWith('/jsdoc.conf.json'),
      'Showcase contains a private runner config.'
    )
  }

  const fingerprint = fingerprintFiles(files)
  const buildEvidence = readJson(path.join(topology.evidenceRoot, 'build.json'))
  assert(
    buildEvidence.status === 'ready-for-wp118-check',
    'Build evidence status drifted.'
  )
  assert(
    JSON.stringify(buildEvidence.output) ===
      JSON.stringify({
        root: 'build/hia-docs/showcase',
        generatedTracked: false,
        ...fingerprint
      }),
    'Build evidence fingerprint does not match the public tree.'
  )

  const evidence = {
    contract: 'bp-js-cookie-documentation-showcase-check',
    contractVersion: '0.1.0-draft',
    status: 'offline-verified',
    buildCommit: expectedCommit,
    runtime: {
      node: process.versions.node,
      supported: DOCUMENTATION_NODE_VERSIONS
    },
    matrix: {
      profileCount: expectedProfiles.length,
      surfaceCount: surfaceSummaries.length,
      identityGroupCount: identityByGroup.size,
      sourceModes: SOURCE_READING_MODES,
      skins: SHOWCASE_SKINS,
      defaultProfileId: DEFAULT_SHOWCASE_PROFILE_ID
    },
    output: fingerprint,
    checks: {
      allSurfacesHaveIndex: true,
      allSurfacesMultiPage: true,
      allSurfacesHaveThreeSkinCatalog: true,
      nativeDisclosurePresent: true,
      sourceCarrierModesVerified: ['fetch', 'embed', 'link'],
      sourceBodiesAbsentFromIndexesAndJson: true,
      publicJsonAbsolutePathCount: 0,
      privateRunnerConfigCount: 0,
      symbolicLinkCount: 0,
      stableIdentityAcrossVariants: true,
      hubNoScriptReachability: true
    },
    permissions: {
      browserStack: false,
      credentialRead: false,
      network: false,
      targetRepositoryAccess: false,
      targetRepositoryWrite: false
    }
  }
  fs.mkdirSync(topology.evidenceRoot, { recursive: true })
  fs.writeFileSync(
    path.join(topology.evidenceRoot, 'check.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  )
  process.stdout.write(
    `${JSON.stringify({ status: evidence.status, profileCount: expectedProfiles.length, surfaceCount: surfaceSummaries.length, fileCount: fingerprint.fileCount, sha256: fingerprint.sha256, privacyLeakCount: 0 })}\n`
  )
}

try {
  main()
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
}

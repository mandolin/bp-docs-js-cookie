/**
 * <lang><zh-CN>验证 bp-docs-js-cookie ROP overlay、本地双输出与 none/link 隐私边界。</zh-CN><en>Validates the bp-docs-js-cookie ROP overlay, local dual outputs, and none/link privacy boundary.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-check
 * @lang zh-CN 检查器不读取 target、不访问网络、不执行 Cookie API，只读取 BP/owner Git metadata 与本地生成文件。
 * @lang en The checker reads no target, accesses no network, and executes no Cookie API; it reads only BP/owner Git metadata and local generated files.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  BASELINE_COMMIT,
  DOCUMENTATION_NODE_VERSIONS,
  OWNER_COMMITS,
  PRIVACY_POLICY,
  SOURCE_FILES,
  resolveTopology
} from './config.mjs'
import { isAbsolutePathLike } from './sanitize.mjs'

/** @lang zh-CN 当前脚本目录用于推导 BP root；该绝对值不会写入 machine evidence。 @lang en Current script directory derives the BP root; the absolute value is not written to machine evidence. */
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(moduleDirectory, '..', '..')
/** @lang zh-CN 已冻结的 sibling/output topology。 @lang en Frozen sibling/output topology. */
const topology = resolveTopology(repositoryRoot)

/**
 * <lang><zh-CN>执行只读命令并在非零退出时 fail closed。</zh-CN><en>Runs a read-only command and fails closed on a nonzero exit.</en></lang>
 *
 * @param {string} command <lang><zh-CN>可执行程序。</zh-CN><en>Executable.</en></lang>
 * @param {string[]} args <lang><zh-CN>无 shell 插值的参数。</zh-CN><en>Arguments without shell interpolation.</en></lang>
 * @param {string} cwd <lang><zh-CN>执行目录。</zh-CN><en>Execution directory.</en></lang>
 * @returns {string} <lang><zh-CN>trim 后 stdout。</zh-CN><en>Trimmed stdout.</en></lang>
 */
function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: process.env
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const diagnostic = `${result.stdout || ''}\n${result.stderr || ''}`
      .trim()
      .slice(-6000)
    throw new Error(`${command} exited with ${result.status}:\n${diagnostic}`)
  }
  return (result.stdout || '').trim()
}

/** @lang zh-CN 运行只读 Git 命令。 @lang en Runs a read-only Git command. */
function runGit(args, cwd = repositoryRoot) {
  return runCommand('git', args, cwd)
}

/**
 * <lang><zh-CN>对 machine gate 条件执行带消息断言。</zh-CN><en>Applies a message-bearing assertion to a machine-gate condition.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为 truthy 的条件。</zh-CN><en>Condition that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>失败时的公开安全说明。</zh-CN><en>Public-safe explanation on failure.</en></lang>
 * @returns {void}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * <lang><zh-CN>递归列出一个输出树的文件。</zh-CN><en>Recursively lists files in one output tree.</en></lang>
 *
 * @param {string} root <lang><zh-CN>输出 root。</zh-CN><en>Output root.</en></lang>
 * @returns {string[]} <lang><zh-CN>按相对路径排序的文件名。</zh-CN><en>Filenames sorted by relative path.</en></lang>
 */
function listFiles(root) {
  const files = []
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else if (entry.isFile()) {
        files.push(path.relative(root, entryPath).replaceAll('\\', '/'))
      }
    }
  }
  visit(root)
  return files.sort((left, right) => left.localeCompare(right))
}

/**
 * <lang><zh-CN>检查 JSON value 中的路径、raw comment 与 source body carrier。</zh-CN><en>Checks a JSON value for paths, raw comments, and source-body carriers.</en></lang>
 *
 * @param {unknown} value <lang><zh-CN>当前 JSON value。</zh-CN><en>Current JSON value.</en></lang>
 * @param {string[]} propertyPath <lang><zh-CN>从 root 到当前值的属性路径。</zh-CN><en>Property path from root to the current value.</en></lang>
 * @param {Object} counters <lang><zh-CN>可变泄漏计数器。</zh-CN><en>Mutable leak counters.</en></lang>
 * @returns {void}
 */
function scanJsonValue(value, propertyPath, counters) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanJsonValue(item, [...propertyPath, String(index)], counters)
    )
    return
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (
        /filePath$|^comment$|^primaryBlock$|^sourcePrimaryBlock$|^sourceContent$|^sourcesContent$/iu.test(
          key
        )
      ) {
        counters.blockedKeyCount += 1
      }
      const isSourceCarrier = propertyPath.some((segment) =>
        /source|primaryBlock|preview|fragment|reference/i.test(segment)
      )
      if (key === 'content' && isSourceCarrier) counters.sourceContentCount += 1
      if (key === 'preview' && isSourceCarrier) counters.sourceContentCount += 1
      scanJsonValue(item, [...propertyPath, key], counters)
    }
    return
  }
  if (isAbsolutePathLike(value)) counters.absolutePathCount += 1
}

/**
 * <lang><zh-CN>检查 generated/public-integration 文件的文本与 JSON privacy。</zh-CN><en>Checks textual and JSON privacy across generated/public-integration files.</en></lang>
 *
 * @param {string[]} absoluteFiles <lang><zh-CN>允许读取的本地生成文件。</zh-CN><en>Local generated files allowed to be read.</en></lang>
 * @returns {Object} <lang><zh-CN>全部应为 0 的泄漏计数与 source link 数。</zh-CN><en>Leak counts that must all be zero plus the source-link count.</en></lang>
 */
function scanPublicArtifacts(absoluteFiles) {
  const counters = {
    absolutePathCount: 0,
    blockedKeyCount: 0,
    credentialMarkerCount: 0,
    rawLocaleTagCount: 0,
    sourceBodyFingerprintCount: 0,
    sourceContentCount: 0,
    sourceLinkCount: 0,
    unpinnedSourceLinkCount: 0
  }
  const buildCommit = runGit(['rev-parse', 'HEAD'])
  const sourceLinkPattern =
    /https:\/\/github\.com\/mandolin\/bp-docs-js-cookie\/blob\/([0-9a-f]{40})\//gu
  const credentialPattern =
    /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY|(?:api|access)[_-]?token\s*[:=]|client[_-]?secret\s*[:=]/giu
  const sourceFingerprints = [
    'return (document.cookie =',
    'for (var i = 1; i < arguments.length; i++)',
    'return value.replace(/(%[\\dA-F]{2})+/gi, decodeURIComponent)'
  ]

  for (const absolutePath of absoluteFiles) {
    const body = fs.readFileSync(absolutePath, 'utf8')
    counters.credentialMarkerCount += (
      body.match(credentialPattern) || []
    ).length
    counters.rawLocaleTagCount += (
      body.match(/@lang\s+(?:zh-CN|en)\b/gu) || []
    ).length
    counters.sourceBodyFingerprintCount += sourceFingerprints.filter(
      (fingerprint) => body.includes(fingerprint)
    ).length
    for (const match of body.matchAll(sourceLinkPattern)) {
      counters.sourceLinkCount += 1
      if (match[1] !== buildCommit) counters.unpinnedSourceLinkCount += 1
    }
    if (absolutePath.endsWith('.json')) {
      scanJsonValue(JSON.parse(body), [], counters)
    }
  }
  return counters
}

/**
 * <lang><zh-CN>验证四个 source 的 changed-scope ROP 与 comment-only 语义边界。</zh-CN><en>Validates changed-scope ROP and the comment-only semantic boundary for four sources.</en></lang>
 *
 * @returns {Object} <lang><zh-CN>节点/语言/流程注释计数。</zh-CN><en>Node/language/flow-comment counts.</en></lang>
 */
function validateSourceOverlay() {
  const counts = {}
  const minimumFlowComments = {
    'index.js': 1,
    'src/api.mjs': 27,
    'src/assign.mjs': 6,
    'src/converter.mjs': 3
  }

  for (const relativePath of SOURCE_FILES) {
    const body = fs.readFileSync(
      path.join(repositoryRoot, relativePath),
      'utf8'
    )
    const jsdocCount = (body.match(/\/\*\*/gu) || []).length
    const zhCount = (body.match(/@lang zh-CN\b/gu) || []).length
    const enCount = (body.match(/@lang en\b/gu) || []).length
    const inlineLangCount = (body.match(/<lang>/gu) || []).length
    const flowCommentCount = (body.match(/\/\/ <lang>/gu) || []).length
    assert(
      body.includes('@module '),
      `${relativePath} lacks a stable @module identity.`
    )
    assert(jsdocCount >= 1, `${relativePath} lacks a JSDoc node.`)
    assert(
      zhCount >= 1 && enCount >= 1,
      `${relativePath} lacks canonical zh-CN/en @lang fields.`
    )
    assert(
      inlineLangCount >= 1,
      `${relativePath} lacks inline <lang> bilingual text.`
    )
    assert(
      flowCommentCount >= minimumFlowComments[relativePath],
      `${relativePath} does not meet the frozen flow-comment floor.`
    )
    assert(
      !/@hiaText|@hiaBlock/gu.test(body),
      `${relativePath} uses a forbidden legacy locale tag.`
    )
    counts[relativePath] = {
      jsdocCount,
      zhCount,
      enCount,
      inlineLangCount,
      flowCommentCount
    }
  }

  // <lang><zh-CN>相对 baseline 的新增/删除行必须全部是注释或空行；任何 runtime token 变化都拒绝。</zh-CN><en>Every added/removed line against the baseline must be a comment or blank; any runtime-token change is refused.</en></lang>
  const diff = runGit([
    'diff',
    '--unified=0',
    BASELINE_COMMIT,
    '--',
    ...SOURCE_FILES
  ])
  const semanticDiffLines = diff
    .split(/\r?\n/u)
    .filter((line) => /^[+-][^+-]/u.test(line))
    .map((line) => line.slice(1).trim())
    .filter(
      (line) =>
        line !== '' &&
        !line.startsWith('//') &&
        !line.startsWith('/*') &&
        !line.startsWith('*') &&
        !line.startsWith('*/')
    )
  assert(
    semanticDiffLines.length === 0,
    'Runtime semantic diff detected in the four-file documentation overlay.'
  )
  runGit([
    'diff',
    '--quiet',
    BASELINE_COMMIT,
    '--',
    'package.json',
    'package-lock.json'
  ])
  runGit(['diff', '--quiet', '--', 'package.json', 'package-lock.json'])
  return counts
}

/**
 * <lang><zh-CN>执行完整静态与生成产物 gate，并写 count/status-only check evidence。</zh-CN><en>Runs the complete static/generated-artifact gate and writes count/status-only check evidence.</en></lang>
 *
 * @returns {void}
 */
function main() {
  assert(
    DOCUMENTATION_NODE_VERSIONS.includes(process.versions.node),
    `Documentation check requires Node ${DOCUMENTATION_NODE_VERSIONS.join(' or ')}.`
  )
  const sourceCounts = validateSourceOverlay()
  assert(
    fs.existsSync(topology.jsdocNativeRoot),
    'Independent JSDoc output is missing.'
  )
  assert(fs.existsSync(topology.portalOutputRoot), 'Portal output is missing.')

  const independentFiles = listFiles(topology.jsdocNativeRoot)
  const portalFiles = listFiles(topology.portalOutputRoot)
  const requiredIndependent = [
    'hia-metadata.json',
    'hia-theme.css',
    'hia-theme.js',
    'i18n-index.json',
    'index.en.html',
    'index.html',
    'index.zh-CN.html',
    'search-index.json'
  ]
  for (const required of requiredIndependent) {
    assert(
      independentFiles.includes(required),
      `Independent output is missing ${required}.`
    )
  }
  for (const required of [
    'assets/hia-default.css',
    'assets/hia-default.js',
    'hia-manifest.json',
    'index.html'
  ]) {
    assert(
      portalFiles.includes(required),
      `Portal output is missing ${required}.`
    )
  }

  const publicIntegrationPath = path.join(
    topology.cacheRoot,
    'hia-integration.public.json'
  )
  assert(
    fs.existsSync(publicIntegrationPath),
    'Public-safe integration artifact is missing.'
  )
  assert(
    !fs.existsSync(path.join(topology.cacheRoot, 'hia-integration.raw.json')),
    'Raw integration artifact must be removed after sanitization.'
  )
  assert(
    !fs.existsSync(path.join(topology.cacheRoot, 'jsdoc.config.json')),
    'Absolute-path temporary JSDoc config must be removed after the build.'
  )

  const absolutePublicFiles = [
    ...independentFiles.map((relativePath) =>
      path.join(topology.jsdocNativeRoot, relativePath)
    ),
    ...portalFiles.map((relativePath) =>
      path.join(topology.portalOutputRoot, relativePath)
    ),
    publicIntegrationPath
  ]
  const privacy = scanPublicArtifacts(absolutePublicFiles)
  assert(
    privacy.absolutePathCount === 0,
    'Public artifacts contain an absolute path.'
  )
  assert(
    privacy.blockedKeyCount === 0,
    'Public JSON contains a blocked raw/path/body key.'
  )
  assert(
    privacy.sourceContentCount === 0,
    'Public JSON contains source content.'
  )
  assert(
    privacy.credentialMarkerCount === 0,
    'Public artifacts contain a credential marker.'
  )
  assert(
    privacy.rawLocaleTagCount === 0,
    'Public artifacts expose raw @lang syntax.'
  )
  assert(
    privacy.sourceBodyFingerprintCount === 0,
    'Public artifacts contain a runtime source-body fingerprint.'
  )
  assert(
    privacy.sourceLinkCount >= SOURCE_FILES.length,
    'Public outputs lack source links for the frozen source scope.'
  )
  assert(
    privacy.unpinnedSourceLinkCount === 0,
    'A public source link is not pinned to the build commit.'
  )

  const nativeHtml = fs.readFileSync(
    path.join(topology.jsdocNativeRoot, 'index.html'),
    'utf8'
  )
  const portalHtml = fs.readFileSync(
    path.join(topology.portalOutputRoot, 'index.html'),
    'utf8'
  )
  const portalManifest = fs.readFileSync(
    path.join(topology.portalOutputRoot, 'hia-manifest.json'),
    'utf8'
  )
  assert(
    nativeHtml.includes('data-hia-locale-control'),
    'Independent output lacks runtime locale controls.'
  )
  assert(
    nativeHtml.includes('zh-CN') && nativeHtml.includes('en'),
    'Independent output lacks the zh-CN/en locale pair.'
  )
  assert(
    `${portalHtml}\n${portalManifest}`.includes('documentation-portal-theme') &&
      `${portalHtml}\n${portalManifest}`.includes('0.1.0-draft'),
    'Portal output lacks the frozen W-P104 theme contract reference.'
  )

  const integration = JSON.parse(fs.readFileSync(publicIntegrationPath, 'utf8'))
  assert(
    integration.contract === 'hia-jsdoc-integration',
    'Unexpected JPHS integration contract.'
  )
  assert(
    integration.contractVersion === '0.1.0',
    'Unexpected JPHS integration contract version.'
  )
  assert(
    Array.isArray(integration.ir?.nodes) && integration.ir.nodes.length === 18,
    'Integration must contain the frozen 18-node documentation surface.'
  )
  const checkEvidence = {
    contract: 'bp-js-cookie-documentation-check',
    contractVersion: '0.1.0-draft',
    status: 'pass',
    buildCommit: runGit(['rev-parse', 'HEAD']),
    runtime: {
      node: process.versions.node,
      supported: DOCUMENTATION_NODE_VERSIONS
    },
    owners: OWNER_COMMITS,
    source: {
      fileCount: SOURCE_FILES.length,
      overlaySemanticDiffCount: 0,
      packageInputsStable: true,
      counts: sourceCounts
    },
    outputs: {
      independentFileCount: independentFiles.length,
      portalFileCount: portalFiles.length,
      integrationNodeCount: integration.ir.nodes.length,
      independentAndPortalSeparated: true
    },
    privacy: {
      policy: PRIVACY_POLICY,
      ...privacy
    },
    permissions: {
      network: false,
      packagePublish: false,
      pagesEnablement: false,
      targetRepositoryAccess: false,
      targetRepositoryWrite: false,
      workflowMutation: false
    }
  }
  fs.mkdirSync(topology.evidenceRoot, { recursive: true })
  fs.writeFileSync(
    path.join(topology.evidenceRoot, 'check.json'),
    `${JSON.stringify(checkEvidence, null, 2)}\n`,
    'utf8'
  )
  process.stdout.write(
    `HIA docs check passed: ${integration.ir.nodes.length} nodes, ${privacy.sourceLinkCount} pinned source links, zero privacy leaks.\n`
  )
}

main()

/**
 * <lang><zh-CN>构建 bp-docs-js-cookie 的独立 JSDoc 与统一 HIA Portal 本地输出。</zh-CN><en>Builds the independent JSDoc and unified HIA Portal local outputs for bp-docs-js-cookie.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-build
 * @lang zh-CN 顶层脚本必须由 mise 管理的 Node 22.23.0 或 24.12.0 调用；子级 Node/pnpm 同样通过 mise。
 * @lang en The top-level script must run under mise-managed Node 22.23.0 or 24.12.0; child Node/pnpm commands also go through mise.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  ALLOWED_CHANGE_PATTERNS,
  BASELINE_COMMIT,
  DOCUMENTATION_NODE_VERSIONS,
  OWNER_COMMITS,
  PRIVACY_POLICY,
  SOURCE_FILES,
  createPortalConfig,
  createJsdocConfig,
  createPortalProjectManifest,
  resolveTopology
} from './config.mjs'
import { sanitizeJsonFile } from './sanitize.mjs'

/** @lang zh-CN 当前模块目录只用于推导 BP repository root，不写入 evidence。 @lang en Current module directory is used only to derive the BP repository root and is not written to evidence. */
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
/** @lang zh-CN 文档工具位于 `<repo>/tools/hia-docs`，因此向上两级得到仓库根。 @lang en Documentation tooling lives at `<repo>/tools/hia-docs`, so two parent traversals yield the repository root. */
const repositoryRoot = path.resolve(moduleDirectory, '..', '..')
/** @lang zh-CN 当前进程使用的绝对 topology；公开 evidence 只投射其中的相对语义。 @lang en Absolute topology for the current process; public evidence projects only its relative semantics. */
const topology = resolveTopology(repositoryRoot)

/**
 * <lang><zh-CN>执行命令并在非零退出时携带有界 stdout/stderr fail closed。</zh-CN><en>Runs a command and fails closed with bounded stdout/stderr on a nonzero exit.</en></lang>
 *
 * @param {string} command <lang><zh-CN>可执行程序名。</zh-CN><en>Executable name.</en></lang>
 * @param {string[]} args <lang><zh-CN>不经 shell 插值的参数。</zh-CN><en>Arguments passed without shell interpolation.</en></lang>
 * @param {string} cwd <lang><zh-CN>已验证的执行目录。</zh-CN><en>Validated execution directory.</en></lang>
 * @returns {string} <lang><zh-CN>成功命令的 stdout。</zh-CN><en>Stdout from the successful command.</en></lang>
 */
function runCommand(command, args, cwd) {
  // <lang><zh-CN>shell=false 保证参数不被 PowerShell/cmd 二次解释；UTF-8 文本仅用于诊断。</zh-CN><en>shell=false prevents PowerShell/cmd reinterpretation of arguments; UTF-8 text is used only for diagnostics.</en></lang>
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: process.env
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    // <lang><zh-CN>限制错误文本长度，避免第三方命令把大日志或敏感环境反射进终端。</zh-CN><en>Bound error text so a third-party command cannot reflect a large log or sensitive environment into the terminal.</en></lang>
    const diagnostic = `${result.stdout || ''}\n${result.stderr || ''}`
      .trim()
      .slice(-6000)
    throw new Error(`${command} exited with ${result.status}:\n${diagnostic}`)
  }
  return (result.stdout || '').trim()
}

/** @lang zh-CN 运行只读 Git 命令并返回 trim 后文本。 @lang en Runs a read-only Git command and returns trimmed text. */
function runGit(args, cwd = repositoryRoot) {
  return runCommand('git', args, cwd)
}

/**
 * <lang><zh-CN>验证当前 Node 属于文档工具支持窗口。</zh-CN><en>Validates that the current Node belongs to the documentation-tool support window.</en></lang>
 *
 * @returns {void}
 */
function validateNodeVersion() {
  // <lang><zh-CN>process.versions.node 是 mise 已解析的精确 runtime；不接受仅 major 匹配。</zh-CN><en>process.versions.node is the exact runtime resolved by mise; a major-only match is not accepted.</en></lang>
  if (!DOCUMENTATION_NODE_VERSIONS.includes(process.versions.node)) {
    throw new Error(
      `Documentation build requires Node ${DOCUMENTATION_NODE_VERSIONS.join(' or ')}, received ${process.versions.node}.`
    )
  }
}

/**
 * <lang><zh-CN>判断一个相对 Git path 是否位于 W-P109 frozen change scope。</zh-CN><en>Determines whether a relative Git path belongs to the frozen W-P109 change scope.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>Git 使用正斜杠的仓库相对路径。</zh-CN><en>Repository-relative path using Git forward slashes.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否在 exact/prefix allowlist 中。</zh-CN><en>Whether the path is in the exact/prefix allowlist.</en></lang>
 */
function isAllowedChange(relativePath) {
  return ALLOWED_CHANGE_PATTERNS.some((pattern) =>
    pattern.endsWith('/')
      ? relativePath.startsWith(pattern)
      : relativePath === pattern
  )
}

/**
 * <lang><zh-CN>验证 BP lineage、package/lock 不变与当前 changed-path boundary。</zh-CN><en>Validates BP lineage, package/lock stability, and the current changed-path boundary.</en></lang>
 *
 * @returns {string} <lang><zh-CN>用于源码链接的当前 BP HEAD commit。</zh-CN><en>Current BP HEAD commit used for source links.</en></lang>
 */
function validateRepositoryBoundary() {
  runGit(['merge-base', '--is-ancestor', BASELINE_COMMIT, 'HEAD'])
  // <lang><zh-CN>root package/lock 相对 baseline、HEAD 和 working tree 都必须无差异。</zh-CN><en>Root package/lock must have no differences against the baseline, HEAD, or working tree.</en></lang>
  runGit([
    'diff',
    '--quiet',
    BASELINE_COMMIT,
    '--',
    'package.json',
    'package-lock.json'
  ])
  runGit(['diff', '--quiet', '--', 'package.json', 'package-lock.json'])

  // <lang><zh-CN>tracked、staged 与 untracked 三类 path 合并后统一执行 closed allowlist。</zh-CN><en>Tracked, staged, and untracked paths are combined under one closed allowlist.</en></lang>
  const changedPaths = new Set([
    ...runGit(['diff', '--name-only', BASELINE_COMMIT, '--']).split(/\r?\n/u),
    ...runGit(['diff', '--name-only', '--cached', '--']).split(/\r?\n/u),
    ...runGit(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/u)
  ])
  for (const relativePath of changedPaths) {
    if (relativePath && !isAllowedChange(relativePath)) {
      throw new Error(`W-P109 change boundary refused path: ${relativePath}`)
    }
  }

  // <lang><zh-CN>40 位 lowercase SHA 是公开 source link 唯一允许的 revision identity。</zh-CN><en>A 40-character lowercase SHA is the only revision identity allowed in public source links.</en></lang>
  const buildCommit = runGit(['rev-parse', 'HEAD'])
  if (!/^[0-9a-f]{40}$/u.test(buildCommit)) {
    throw new Error('BP HEAD is not a full lowercase Git commit identity.')
  }
  return buildCommit
}

/**
 * <lang><zh-CN>验证一个 sibling owner 的 exact commit 与 clean boundary。</zh-CN><en>Validates exact commit and clean boundary for one sibling owner.</en></lang>
 *
 * @param {string} ownerRoot <lang><zh-CN>owner repository 绝对根。</zh-CN><en>Absolute owner repository root.</en></lang>
 * @param {string} expectedCommit <lang><zh-CN>冻结的完整 commit。</zh-CN><en>Frozen full commit.</en></lang>
 * @param {string} label <lang><zh-CN>仅用于错误消息的中性 owner label。</zh-CN><en>Neutral owner label used only in errors.</en></lang>
 * @returns {void}
 */
function validateOwner(ownerRoot, expectedCommit, label) {
  const actualCommit = runGit(['rev-parse', 'HEAD'], ownerRoot)
  if (actualCommit !== expectedCommit) {
    throw new Error(
      `${label} commit drifted: expected ${expectedCommit}, received ${actualCommit}.`
    )
  }
  if (runGit(['status', '--short'], ownerRoot) !== '') {
    throw new Error(`${label} repository must be clean.`)
  }
}

/**
 * <lang><zh-CN>验证 generated root 是 BP 内唯一允许递归重建的精确目录。</zh-CN><en>Validates that the generated root is the exact BP-local directory allowed for recursive rebuild.</en></lang>
 *
 * @returns {void}
 */
function resetGeneratedRoot() {
  const relative = path
    .relative(repositoryRoot, topology.generatedRoot)
    .replaceAll('\\', '/')
  if (
    relative !== 'build/hia-docs' ||
    !path.isAbsolute(topology.generatedRoot)
  ) {
    throw new Error(
      'Generated output boundary is not the exact build/hia-docs directory.'
    )
  }
  // <lang><zh-CN>只删除已验证的 ignored generated root；源码、dist、其他 build 目录和 sibling owner 不受影响。</zh-CN><en>Delete only the validated ignored generated root; source, dist, other build directories, and sibling owners are unaffected.</en></lang>
  fs.rmSync(topology.generatedRoot, { recursive: true, force: true })
  fs.mkdirSync(topology.cacheRoot, { recursive: true })
  fs.mkdirSync(topology.evidenceRoot, { recursive: true })
}

/**
 * <lang><zh-CN>递归查找输出树中的 JSON 文件并原地应用 privacy sanitizer。</zh-CN><en>Recursively finds JSON files in an output tree and applies the privacy sanitizer in place.</en></lang>
 *
 * @param {string} root <lang><zh-CN>已生成的独立或 Portal output root。</zh-CN><en>Generated independent or Portal output root.</en></lang>
 * @returns {void}
 */
function sanitizeJsonTree(root) {
  if (!fs.existsSync(root)) return
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name)
    if (entry.isDirectory()) sanitizeJsonTree(entryPath)
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      sanitizeJsonFile(entryPath, entryPath)
    }
  }
}

/**
 * <lang><zh-CN>收集输出树的相对文件、byte size 与 SHA-256，不复制正文。</zh-CN><en>Collects relative files, byte sizes, and SHA-256 for an output tree without copying bodies.</en></lang>
 *
 * @param {string} root <lang><zh-CN>输出树绝对根。</zh-CN><en>Absolute output-tree root.</en></lang>
 * @returns {Array<{path: string, bytes: number, sha256: string}>} <lang><zh-CN>按相对路径排序的摘要。</zh-CN><en>Summary sorted by relative path.</en></lang>
 */
function summarizeTree(root) {
  const files = []
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name)
      if (entry.isDirectory()) visit(entryPath)
      else if (entry.isFile()) {
        const body = fs.readFileSync(entryPath)
        files.push({
          path: path.relative(root, entryPath).replaceAll('\\', '/'),
          bytes: body.byteLength,
          sha256: crypto.createHash('sha256').update(body).digest('hex')
        })
      }
    }
  }
  visit(root)
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

/**
 * <lang><zh-CN>执行完整本地双输出构建并写 count/hash/status-only evidence。</zh-CN><en>Runs the complete local dual-output build and writes count/hash/status-only evidence.</en></lang>
 *
 * @returns {void}
 */
function main() {
  validateNodeVersion()
  const buildCommit = validateRepositoryBoundary()
  validateOwner(topology.pluginRoot, OWNER_COMMITS.plugin, 'JPHS')
  validateOwner(topology.themeRoot, OWNER_COMMITS.theme, 'JTH')
  validateOwner(topology.portalRoot, OWNER_COMMITS.portal, 'HIA Portal')
  resetGeneratedRoot()

  // <lang><zh-CN>JSDoc runtime 由 pinned JPHS lock 安装；缺失时拒绝隐式下载或改变 BP dependency tree。</zh-CN><en>The JSDoc runtime is installed by the pinned JPHS lock; when absent, refuse implicit downloads or BP dependency-tree changes.</en></lang>
  const jsdocEntry = path.join(
    topology.pluginRoot,
    'node_modules',
    'jsdoc',
    'jsdoc.js'
  )
  if (!fs.existsSync(jsdocEntry)) {
    throw new Error(
      'Pinned JPHS dependencies are missing; run its npm ci through mise before rebuilding documentation.'
    )
  }

  // <lang><zh-CN>临时 config/raw integration 可含本机路径或 source body，只允许存在于 ignored cache 且必须在 finally 删除。</zh-CN><en>The temporary config/raw integration may contain host paths or source bodies, so it may exist only in ignored cache and must be deleted in finally.</en></lang>
  const temporaryConfigPath = path.join(topology.cacheRoot, 'jsdoc.config.json')
  const rawIntegrationPath = path.join(
    topology.cacheRoot,
    'hia-integration.raw.json'
  )
  const publicIntegrationPath = path.join(
    topology.cacheRoot,
    'hia-integration.public.json'
  )
  /** @lang zh-CN 临时 project manifest 只承载公开标题、locale 与同目录 integration 引用。 @lang en Temporary project manifest carries only the public title, locales, and same-directory integration reference. */
  const portalProjectManifestPath = path.join(
    topology.cacheRoot,
    'portal-project.hia-project.json'
  )
  /** @lang zh-CN 单页 Portal 配置只改变公开小站布局，不改变 owner contract。 @lang en Single-page Portal config changes only the small public-site layout, not owner contracts. */
  const portalConfigPath = path.join(
    topology.cacheRoot,
    'portal.hia.config.json'
  )

  try {
    const jsdocConfig = createJsdocConfig(topology, buildCommit)
    fs.writeFileSync(
      temporaryConfigPath,
      `${JSON.stringify(jsdocConfig, null, 2)}\n`,
      'utf8'
    )

    // <lang><zh-CN>真实 JSDoc parse/theme 执行使用当前精确 Node，并由外层 mise identity 继续传递。</zh-CN><en>The real JSDoc parse/theme execution uses the current exact Node and carries forward the outer mise identity.</en></lang>
    runCommand(
      'mise',
      [
        'exec',
        `node@${process.versions.node}`,
        '--',
        'node',
        jsdocEntry,
        '-c',
        temporaryConfigPath
      ],
      repositoryRoot
    )
    if (!fs.existsSync(rawIntegrationPath)) {
      throw new Error('JPHS did not create the required integration artifact.')
    }

    // <lang><zh-CN>Portal 只消费清洗后的 integration；raw artifact 绝不跨过此 handoff。</zh-CN><en>The Portal consumes only the sanitized integration; the raw artifact never crosses this handoff.</en></lang>
    sanitizeJsonFile(rawIntegrationPath, publicIntegrationPath)
    sanitizeJsonTree(topology.jsdocNativeRoot)
    fs.writeFileSync(
      portalProjectManifestPath,
      `${JSON.stringify(createPortalProjectManifest(), null, 2)}\n`,
      'utf8'
    )
    fs.writeFileSync(
      portalConfigPath,
      `${JSON.stringify(createPortalConfig(), null, 2)}\n`,
      'utf8'
    )

    // <lang><zh-CN>main owner 先按自身 mise/pnpm lock 构建，BP 不建立跨仓依赖或修改其 dist。</zh-CN><en>The main owner builds first under its own mise/pnpm lock; the BP creates no cross-repository dependency and does not modify its dist.</en></lang>
    runCommand(
      'mise',
      ['exec', '--', 'pnpm', 'run', 'build'],
      topology.portalRoot
    )
    const cliEntry = path.join(
      topology.portalRoot,
      'apps',
      'cli',
      'dist',
      'index.js'
    )
    runCommand(
      'mise',
      [
        'exec',
        `node@${process.versions.node}`,
        '--',
        'node',
        cliEntry,
        'docs',
        'build',
        '--config',
        portalConfigPath,
        '--project-manifest',
        portalProjectManifestPath,
        '--out',
        topology.portalOutputRoot,
        '--locale',
        'zh-CN'
      ],
      repositoryRoot
    )
    sanitizeJsonTree(topology.portalOutputRoot)
  } finally {
    // <lang><zh-CN>无论 build 成功或失败都移除带绝对路径的 config 与带正文的 raw integration。</zh-CN><en>Remove the absolute-path config and source-bearing raw integration whether the build succeeds or fails.</en></lang>
    fs.rmSync(temporaryConfigPath, { force: true })
    fs.rmSync(rawIntegrationPath, { force: true })
    fs.rmSync(portalProjectManifestPath, { force: true })
    fs.rmSync(portalConfigPath, { force: true })
  }

  // <lang><zh-CN>public integration 经过 JSON parse 后只读取计数/diagnostic summary，不向 evidence 复制节点正文。</zh-CN><en>After JSON parsing, only counts and diagnostic summaries are read from the public integration; node bodies are not copied into evidence.</en></lang>
  const integration = JSON.parse(fs.readFileSync(publicIntegrationPath, 'utf8'))
  const independentFiles = summarizeTree(topology.jsdocNativeRoot)
  const portalFiles = summarizeTree(topology.portalOutputRoot)
  const buildEvidence = {
    contract: 'bp-js-cookie-local-documentation-build',
    contractVersion: '0.1.0-draft',
    status: 'ready-for-wp111-pages-check',
    buildCommit,
    runtime: {
      node: process.versions.node,
      supported: DOCUMENTATION_NODE_VERSIONS
    },
    owners: OWNER_COMMITS,
    inputs: {
      sourceFiles: SOURCE_FILES,
      sourceFileCount: SOURCE_FILES.length,
      packageInputsStable: true
    },
    integration: {
      contract: integration.contract,
      contractVersion: integration.contractVersion,
      nodeCount: Array.isArray(integration.ir?.nodes)
        ? integration.ir.nodes.length
        : 0,
      diagnosticCounts: integration.diagnosticCounts || {}
    },
    outputs: {
      generatedTracked: false,
      independent: {
        root: 'build/hia-docs/jsdoc-native',
        fileCount: independentFiles.length,
        files: independentFiles
      },
      portal: {
        root: 'build/hia-docs/portal',
        fileCount: portalFiles.length,
        files: portalFiles
      }
    },
    privacy: PRIVACY_POLICY,
    permissions: {
      browserStack: false,
      credentialRead: false,
      networkFetchByGeneratedSite: false,
      packagePublish: false,
      pagesEnablement: false,
      targetRepositoryAccess: false,
      targetRepositoryWrite: false,
      workflowMutation: false
    }
  }
  const evidencePath = path.join(topology.evidenceRoot, 'build.json')
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(buildEvidence, null, 2)}\n`,
    'utf8'
  )
  process.stdout.write(
    `HIA docs built: ${integration.ir?.nodes?.length || 0} nodes, ${independentFiles.length} independent files, ${portalFiles.length} portal files.\n`
  )
}

main()

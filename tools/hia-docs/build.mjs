/**
 * <lang><zh-CN>构建 bp-docs-js-cookie 的 27-profile、36-surface 文档工程展示矩阵。</zh-CN><en>Builds the 27-profile, 36-surface documentation-engineering showcase matrix for bp-docs-js-cookie.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-build
 * @lang zh-CN 顶层与子级 JavaScript 命令都使用 mise 管理的 Node 22.23.0 或 24.12.0；输出只进入 ignored build/hia-docs。
 * @lang en Top-level and child JavaScript commands use mise-managed Node 22.23.0 or 24.12.0; output is confined to ignored build/hia-docs.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  ALLOWED_CHANGE_PATTERNS,
  BASELINE_COMMIT,
  DOCUMENTATION_NODE_VERSIONS,
  OWNER_COMMITS,
  PRIVACY_POLICY,
  SOURCE_FILES,
  createJsdocConfig,
  createPortalConfig,
  createPortalProjectManifest,
  createShowcaseProfiles,
  resolveTopology
} from './config.mjs'
import {
  SHOWCASE_HUB_CSS,
  SHOWCASE_HUB_JS,
  createShowcaseManifest,
  renderShowcaseHub
} from './hub.mjs'
import { sanitizeJsonFile } from './sanitize.mjs'

/** @lang zh-CN 当前模块目录只用于推导 BP repository root，不进入公开产物。 @lang en Current module directory is used only to derive the BP repository root and never enters public artifacts. */
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
/** @lang zh-CN 文档工具位于 `<repo>/tools/hia-docs`，向上两级得到 BP 根。 @lang en Documentation tooling lives at `<repo>/tools/hia-docs`, so two parent traversals yield the BP root. */
const repositoryRoot = path.resolve(moduleDirectory, '..', '..')
/** @lang zh-CN 当前进程的绝对 topology；只在内存和 ignored cache 使用。 @lang en Absolute topology for the current process; used only in memory and the ignored cache. */
const topology = resolveTopology(repositoryRoot)

/**
 * <lang><zh-CN>执行无 shell 插值的子进程，并用有界诊断 fail closed。</zh-CN><en>Runs a child process without shell interpolation and fails closed with bounded diagnostics.</en></lang>
 *
 * @param {string} command <lang><zh-CN>可执行程序。</zh-CN><en>Executable.</en></lang>
 * @param {string[]} args <lang><zh-CN>原样参数数组。</zh-CN><en>Literal argument array.</en></lang>
 * @param {string} cwd <lang><zh-CN>已验证的工作目录。</zh-CN><en>Validated working directory.</en></lang>
 * @returns {string} <lang><zh-CN>trim 后的 stdout。</zh-CN><en>Trimmed stdout.</en></lang>
 * @throws {Error} <lang><zh-CN>进程无法启动或非零退出时抛出。</zh-CN><en>Thrown when the process cannot start or exits nonzero.</en></lang>
 */
function runCommand(command, args, cwd) {
  // <lang><zh-CN>shell=false 防止路径、profile id 或 commit 被 PowerShell/cmd 二次解释。</zh-CN><en>shell=false prevents PowerShell/cmd from reinterpreting paths, profile IDs, or commits.</en></lang>
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    shell: false,
    env: process.env
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    // <lang><zh-CN>错误文本限制为末尾 6000 字符，避免第三方命令反射大日志或环境内容。</zh-CN><en>Error text is limited to the last 6,000 characters so third-party commands cannot reflect large logs or environment content.</en></lang>
    const diagnostic = `${result.stdout || ''}\n${result.stderr || ''}`
      .trim()
      .slice(-6000)
    throw new Error(`${command} exited with ${result.status}:\n${diagnostic}`)
  }
  return (result.stdout || '').trim()
}

/**
 * <lang><zh-CN>运行只读 Git 命令。</zh-CN><en>Runs a read-only Git command.</en></lang>
 *
 * @param {string[]} args <lang><zh-CN>Git 参数。</zh-CN><en>Git arguments.</en></lang>
 * @param {string} [cwd] <lang><zh-CN>目标仓库，缺省为 BP。</zh-CN><en>Target repository, defaulting to the BP.</en></lang>
 * @returns {string} <lang><zh-CN>trim 后文本。</zh-CN><en>Trimmed text.</en></lang>
 */
function runGit(args, cwd = repositoryRoot) {
  return runCommand('git', args, cwd)
}

/**
 * <lang><zh-CN>验证当前 Node 属于冻结的文档工具支持窗口。</zh-CN><en>Validates that the current Node belongs to the frozen documentation-tool support window.</en></lang>
 *
 * @returns {void}
 */
function validateNodeVersion() {
  if (!DOCUMENTATION_NODE_VERSIONS.includes(process.versions.node)) {
    throw new Error(
      `Documentation build requires Node ${DOCUMENTATION_NODE_VERSIONS.join(' or ')}, received ${process.versions.node}.`
    )
  }
}

/**
 * <lang><zh-CN>判断 BP 相对路径是否位于冻结变更范围。</zh-CN><en>Determines whether a BP-relative path belongs to the frozen change boundary.</en></lang>
 *
 * @param {string} relativePath <lang><zh-CN>使用正斜杠的 Git 路径。</zh-CN><en>Git path using forward slashes.</en></lang>
 * @returns {boolean} <lang><zh-CN>是否通过 exact/prefix allowlist。</zh-CN><en>Whether it passes the exact/prefix allowlist.</en></lang>
 */
function isAllowedChange(relativePath) {
  return ALLOWED_CHANGE_PATTERNS.some((pattern) =>
    pattern.endsWith('/')
      ? relativePath.startsWith(pattern)
      : relativePath === pattern
  )
}

/**
 * <lang><zh-CN>验证 upstream lineage、root package/lock 稳定性与当前 changed-path boundary。</zh-CN><en>Validates upstream lineage, root package/lock stability, and the current changed-path boundary.</en></lang>
 *
 * @returns {string} <lang><zh-CN>用于公开源码链接的 40 位 BP HEAD。</zh-CN><en>Forty-character BP HEAD used for public source links.</en></lang>
 */
function validateRepositoryBoundary() {
  runGit(['merge-base', '--is-ancestor', BASELINE_COMMIT, 'HEAD'])
  runGit([
    'diff',
    '--quiet',
    BASELINE_COMMIT,
    '--',
    'package.json',
    'package-lock.json'
  ])
  runGit(['diff', '--quiet', '--', 'package.json', 'package-lock.json'])

  // <lang><zh-CN>tracked、staged 与 untracked 路径合并后接受同一个 closed allowlist。</zh-CN><en>Tracked, staged, and untracked paths are combined under one closed allowlist.</en></lang>
  const changedPaths = new Set([
    ...runGit(['diff', '--name-only', BASELINE_COMMIT, '--']).split(/\r?\n/u),
    ...runGit(['diff', '--name-only', '--cached', '--']).split(/\r?\n/u),
    ...runGit(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/u)
  ])
  for (const relativePath of changedPaths) {
    if (relativePath && !isAllowedChange(relativePath)) {
      throw new Error(`W-P118 change boundary refused path: ${relativePath}`)
    }
  }

  // <lang><zh-CN>公开 source link 只允许不可漂移的完整 lowercase commit。</zh-CN><en>Public source links accept only a non-floating full lowercase commit.</en></lang>
  const buildCommit = runGit(['rev-parse', 'HEAD'])
  if (!/^[0-9a-f]{40}$/u.test(buildCommit)) {
    throw new Error('BP HEAD is not a full lowercase Git commit identity.')
  }
  return buildCommit
}

/**
 * <lang><zh-CN>验证一个 owner 仓库的 exact commit 与 clean boundary。</zh-CN><en>Validates one owner repository's exact commit and clean boundary.</en></lang>
 *
 * @param {string} ownerRoot <lang><zh-CN>owner 仓库绝对根。</zh-CN><en>Absolute owner repository root.</en></lang>
 * @param {string} expectedCommit <lang><zh-CN>冻结的完整 commit。</zh-CN><en>Frozen full commit.</en></lang>
 * @param {string} label <lang><zh-CN>公开安全的诊断标签。</zh-CN><en>Public-safe diagnostic label.</en></lang>
 * @returns {void}
 */
function validateOwner(ownerRoot, expectedCommit, label) {
  // <lang><zh-CN>实际提交必须与公开配置中的完整 SHA 一致，防止 owner 漂移被矩阵构建静默吸收。</zh-CN><en>The actual commit must equal the full SHA in public configuration so owner drift cannot be silently absorbed by the matrix build.</en></lang>
  const actualCommit = runGit(['rev-parse', 'HEAD'], ownerRoot)
  if (actualCommit !== expectedCommit) {
    throw new Error(
      `${label} commit drifted: expected ${expectedCommit}, received ${actualCommit}.`
    )
  }

  // <lang><zh-CN>npm 会在 Linux 安装 workspace CLI 时校正入口的可执行位；清洁度校验忽略这种平台元数据，但仍拒绝正文差异和未跟踪文件。</zh-CN><en>npm normalizes a workspace CLI entry's executable bit during Linux installation; cleanliness ignores that platform metadata while still rejecting content changes and untracked files.</en></lang>
  const ownerStatus = runGit(
    ['-c', 'core.fileMode=false', 'status', '--short'],
    ownerRoot
  )
  if (ownerStatus !== '') {
    throw new Error(`${label} repository must be clean:\n${ownerStatus}`)
  }
}

/**
 * <lang><zh-CN>一次性验证四个输出 owner，避免部分矩阵由漂移实现生成。</zh-CN><en>Validates all four output owners together so no partial matrix is generated by drifted implementations.</en></lang>
 *
 * @returns {void}
 */
function validateOwners() {
  validateOwner(topology.pluginRoot, OWNER_COMMITS.plugin, 'JPHS')
  validateOwner(topology.themeRoot, OWNER_COMMITS.theme, 'JTH')
  validateOwner(topology.hiaJsdocRoot, OWNER_COMMITS.hiaJsdoc, 'hia-jsdoc')
  validateOwner(topology.portalRoot, OWNER_COMMITS.portal, 'HIA Portal')
}

/**
 * <lang><zh-CN>验证两个 JSDoc runtime 与 Portal CLI 都由显式安装/构建提供。</zh-CN><en>Validates that both JSDoc runtimes and the Portal CLI are supplied by explicit install/build steps.</en></lang>
 *
 * @returns {{directJsdocEntry: string, hiaJsdocRunnerEntry: string, portalCliEntry: string}} <lang><zh-CN>已验证入口。</zh-CN><en>Validated entries.</en></lang>
 */
function resolveRuntimeEntries() {
  // <lang><zh-CN>直接 JPHS/JTH 链复用 BP 工具专属 exact-lock runtime。</zh-CN><en>The direct JPHS/JTH chain uses the BP tool-specific exact-lock runtime.</en></lang>
  const directJsdocEntry = path.join(
    topology.documentationRuntimeRoot,
    'node_modules',
    'jsdoc',
    'jsdoc.js'
  )
  // <lang><zh-CN>hia-jsdoc 必须从自身 workspace 与 lock 安装，不借用 BP root dependency。</zh-CN><en>hia-jsdoc must be installed from its own workspace and lock, without borrowing a BP-root dependency.</en></lang>
  const hiaJsdocRuntime = path.join(
    topology.hiaJsdocRoot,
    'node_modules',
    'jsdoc',
    'jsdoc.js'
  )
  const hiaJsdocRunnerEntry = path.join(
    topology.hiaJsdocRoot,
    'packages',
    'jsdoc-runner',
    'src',
    'index.mjs'
  )
  // <lang><zh-CN>Portal CLI 在 main owner 的一次性 build 后出现。</zh-CN><en>The Portal CLI appears after the one-time main-owner build.</en></lang>
  const portalCliEntry = path.join(
    topology.portalRoot,
    'apps',
    'cli',
    'dist',
    'index.js'
  )

  if (!fs.existsSync(directJsdocEntry)) {
    throw new Error(
      'Pinned BP documentation runtime is missing; run its npm ci through mise.'
    )
  }
  if (!fs.existsSync(hiaJsdocRuntime) || !fs.existsSync(hiaJsdocRunnerEntry)) {
    throw new Error(
      'Pinned hia-jsdoc workspace runtime is missing; run its npm ci through mise.'
    )
  }
  return { directJsdocEntry, hiaJsdocRunnerEntry, portalCliEntry }
}

/**
 * <lang><zh-CN>安全重建唯一允许的 BP-local generated root。</zh-CN><en>Safely rebuilds the only permitted BP-local generated root.</en></lang>
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
  // <lang><zh-CN>删除目标已精确解析为 ignored build/hia-docs；不使用 glob 或环境变量。</zh-CN><en>The deletion target is resolved exactly to ignored build/hia-docs; no glob or environment variable is used.</en></lang>
  fs.rmSync(topology.generatedRoot, { recursive: true, force: true })
  fs.mkdirSync(topology.showcaseRoot, { recursive: true })
  fs.mkdirSync(topology.cacheRoot, { recursive: true })
  fs.mkdirSync(topology.evidenceRoot, { recursive: true })
}

/**
 * <lang><zh-CN>确定性写出 UTF-8 JSON。</zh-CN><en>Deterministically writes UTF-8 JSON.</en></lang>
 *
 * @param {string} filePath <lang><zh-CN>目标绝对路径。</zh-CN><en>Absolute destination path.</en></lang>
 * @param {unknown} value <lang><zh-CN>JSON-compatible 值。</zh-CN><en>JSON-compatible value.</en></lang>
 * @returns {void}
 */
function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

/**
 * <lang><zh-CN>递归清洗 output tree 内的 JSON，正文型源码只允许留在选定 HTML 或 `.txt` carrier。</zh-CN><en>Recursively sanitizes JSON in an output tree; source bodies may remain only in selected HTML or `.txt` carriers.</en></lang>
 *
 * @param {string} root <lang><zh-CN>公开 output root。</zh-CN><en>Public output root.</en></lang>
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
 * <lang><zh-CN>把公开相对 route 解析到 showcase root 内，并拒绝 traversal。</zh-CN><en>Resolves a public relative route inside the showcase root and rejects traversal.</en></lang>
 *
 * @param {string} relativeRoute <lang><zh-CN>由闭集 profile 生成的 route。</zh-CN><en>Route generated by a closed-set profile.</en></lang>
 * @returns {string} <lang><zh-CN>showcase root 内绝对路径。</zh-CN><en>Absolute path inside the showcase root.</en></lang>
 */
function resolveShowcaseRoute(relativeRoute) {
  const destination = path.resolve(topology.showcaseRoot, relativeRoute)
  const boundary = path.relative(topology.showcaseRoot, destination)
  if (!boundary || boundary.startsWith('..') || path.isAbsolute(boundary)) {
    throw new Error(`Unsafe showcase route: ${relativeRoute}`)
  }
  return destination
}

/**
 * <lang><zh-CN>构建一个直接 JPHS/JTH profile，并返回清洗后的 Portal handoff。</zh-CN><en>Builds one direct JPHS/JTH profile and returns its sanitized Portal handoff.</en></lang>
 *
 * @param {Object} profile <lang><zh-CN>jphs-jth-native profile。</zh-CN><en>jphs-jth-native profile.</en></lang>
 * @param {string} buildCommit <lang><zh-CN>精确 BP revision。</zh-CN><en>Exact BP revision.</en></lang>
 * @param {string} jsdocEntry <lang><zh-CN>BP 专属 JSDoc CLI。</zh-CN><en>BP-specific JSDoc CLI.</en></lang>
 * @returns {string} <lang><zh-CN>ignored cache 中的 public-safe integration。</zh-CN><en>Public-safe integration in the ignored cache.</en></lang>
 */
function buildDirectProfile(profile, buildCommit, jsdocEntry) {
  const destination = resolveShowcaseRoute(profile.route)
  const configPath = path.join(
    topology.cacheRoot,
    'direct-config',
    `${profile.id}.json`
  )
  const rawIntegrationPath = path.join(
    topology.cacheRoot,
    'direct-integration',
    `${profile.id}.raw.json`
  )
  const publicIntegrationPath = path.join(
    topology.cacheRoot,
    'direct-integration',
    `${profile.id}.public.json`
  )
  const config = createJsdocConfig(topology, buildCommit, {
    destination,
    integrationOutputFile: rawIntegrationPath,
    hiaMode: 'standalone',
    sourceMode: profile.sourceMode,
    skin: profile.skin,
    scheme: profile.scheme
  })
  writeJson(configPath, config)

  runCommand(
    'mise',
    [
      'exec',
      `node@${process.versions.node}`,
      '--',
      'node',
      jsdocEntry,
      '-c',
      configPath
    ],
    repositoryRoot
  )
  if (!fs.existsSync(path.join(destination, 'index.html'))) {
    throw new Error(`${profile.id} did not create a standalone index.`)
  }
  if (!fs.existsSync(rawIntegrationPath)) {
    throw new Error(`${profile.id} did not create a JPHS integration.`)
  }

  // <lang><zh-CN>raw handoff 永不进入公开树；独立站 JSON 也执行相同 body/path 清洗。</zh-CN><en>The raw handoff never enters the public tree; standalone-site JSON receives the same body/path sanitization.</en></lang>
  sanitizeJsonFile(rawIntegrationPath, publicIntegrationPath)
  sanitizeJsonTree(destination)
  process.stdout.write(`Built ${profile.id}.\n`)
  return publicIntegrationPath
}

/**
 * <lang><zh-CN>通过 hia-jsdoc project runner 构建一个 both-mode standalone surface。</zh-CN><en>Builds one both-mode standalone surface through the hia-jsdoc project runner.</en></lang>
 *
 * @param {Object} profile <lang><zh-CN>hia-jsdoc profile。</zh-CN><en>hia-jsdoc profile.</en></lang>
 * @param {string} buildCommit <lang><zh-CN>精确 BP revision。</zh-CN><en>Exact BP revision.</en></lang>
 * @param {(request: Object) => Object} runHiaJsdocProject <lang><zh-CN>owner 导出的 runner。</zh-CN><en>Runner exported by the owner.</en></lang>
 * @returns {string} <lang><zh-CN>公开 standalone 内已清洗的 integration 路径。</zh-CN><en>Path to the sanitized integration in the public standalone surface.</en></lang>
 */
function buildHiaJsdocProfile(profile, buildCommit, runHiaJsdocProject) {
  const standaloneSurface = profile.surfaces.find(
    (surface) => surface.kind === 'standalone'
  )
  if (!standaloneSurface) {
    throw new Error(`${profile.id} lacks its standalone surface.`)
  }
  const destination = resolveShowcaseRoute(standaloneSurface.path)
  const sourceRootUrl = `https://github.com/mandolin/bp-docs-js-cookie/blob/${buildCommit}`
  const result = runHiaJsdocProject({
    workspaceRoot: repositoryRoot,
    outputDirectory: destination,
    inputs: SOURCE_FILES.map((relativePath) => ({
      kind: relativePath.endsWith('.mjs')
        ? 'javascript-module'
        : 'javascript-source',
      path: relativePath
    })),
    profileIds: [profile.id],
    options: {
      mode: 'both',
      recurse: false,
      includePattern: '.+\\.(?:js|mjs)$',
      writeResultManifest: true,
      sourcesContentPolicy:
        profile.sourceMode === 'embed' ? 'embed' : 'reference',
      plugin: {
        pluginPath: path.join(topology.pluginRoot, 'src', 'index.cjs')
      },
      theme: {
        template: topology.themeRoot
      },
      hia: {
        source: {
          basePath: repositoryRoot,
          mode: 'all',
          link: {
            enabled: true,
            rootUrl: sourceRootUrl,
            openMode: 'new-tab'
          },
          preview: {
            enabled: true,
            defaultExpanded: false
          },
          references: {
            enabled: false,
            defaultExpanded: false
          }
        },
        i18n: {
          enabled: true,
          defaultLocale: 'zh-CN',
          fallbackLocale: 'en',
          locales: ['zh-CN', 'en'],
          mode: 'runtimeSwitch',
          resources: []
        },
        presentation: {
          pageMode: 'multi-page',
          sourceMode: profile.sourceMode
        },
        theme: {
          skin: profile.skin,
          scheme: profile.scheme,
          collapse: {
            docletsDefaultExpanded: true,
            sectionsDefaultExpanded: true,
            metadataDefaultExpanded: false
          },
          languageControls: {
            mode: 'auto',
            dropdownThreshold: 4
          },
          code: {
            controls: true,
            fontFamily: 'system',
            fontSize: 13,
            lineHeight: 1.6,
            tabSize: 2,
            wrap: true
          }
        }
      }
    }
  })
  if (result.status !== 'success') {
    const codes = result.diagnostics
      .map((diagnostic) => diagnostic.code)
      .join(', ')
    throw new Error(`${profile.id} hia-jsdoc runner failed: ${codes}`)
  }

  const integrationPath = path.join(destination, 'hia-integration.json')
  if (!fs.existsSync(path.join(destination, 'index.html'))) {
    throw new Error(`${profile.id} did not create a hia-jsdoc index.`)
  }
  if (!fs.existsSync(integrationPath)) {
    throw new Error(`${profile.id} did not create a hia-jsdoc integration.`)
  }
  // <lang><zh-CN>runner 的 `.hia-jsdoc` config 包含宿主绝对路径，只用于执行，绝不部署。</zh-CN><en>The runner's `.hia-jsdoc` config contains host absolute paths, is execution-only, and is never deployed.</en></lang>
  fs.rmSync(path.join(destination, '.hia-jsdoc'), {
    recursive: true,
    force: true
  })
  sanitizeJsonTree(destination)
  process.stdout.write(`Built ${profile.id} standalone.\n`)
  return integrationPath
}

/**
 * <lang><zh-CN>从 public-safe integration 构建一个 split-site Portal surface。</zh-CN><en>Builds one split-site Portal surface from a public-safe integration.</en></lang>
 *
 * @param {Object} profile <lang><zh-CN>当前矩阵 profile。</zh-CN><en>Current matrix profile.</en></lang>
 * @param {string} surfaceKind <lang><zh-CN>portal 或 portal-bridge。</zh-CN><en>portal or portal-bridge.</en></lang>
 * @param {string} integrationPath <lang><zh-CN>清洗后的 integration。</zh-CN><en>Sanitized integration.</en></lang>
 * @param {string} cliEntry <lang><zh-CN>已构建的 Portal CLI。</zh-CN><en>Built Portal CLI.</en></lang>
 * @returns {void}
 */
function buildPortalSurface(profile, surfaceKind, integrationPath, cliEntry) {
  const surface = profile.surfaces.find(
    (candidate) => candidate.kind === surfaceKind
  )
  if (!surface) {
    throw new Error(`${profile.id} lacks ${surfaceKind} surface.`)
  }
  const destination = resolveShowcaseRoute(surface.path)
  const temporaryRoot = path.join(
    topology.cacheRoot,
    'portal',
    `${profile.id}.${surfaceKind}`
  )
  const stagedIntegration = path.join(
    temporaryRoot,
    'hia-integration.public.json'
  )
  const manifestPath = path.join(
    temporaryRoot,
    'portal-project.hia-project.json'
  )
  const configPath = path.join(temporaryRoot, 'portal.hia.config.json')

  fs.mkdirSync(temporaryRoot, { recursive: true })
  fs.copyFileSync(integrationPath, stagedIntegration)
  writeJson(manifestPath, createPortalProjectManifest())
  writeJson(
    configPath,
    createPortalConfig({
      sourceMode: profile.sourceMode,
      skin: profile.portalSkin,
      scheme: profile.scheme,
      localRoot: repositoryRoot
    })
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
      configPath,
      '--project-manifest',
      manifestPath,
      '--out',
      destination,
      '--locale',
      'zh-CN'
    ],
    repositoryRoot
  )
  if (!fs.existsSync(path.join(destination, 'index.html'))) {
    throw new Error(`${profile.id} did not create ${surfaceKind} index.`)
  }
  sanitizeJsonTree(destination)
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
  process.stdout.write(`Built ${profile.id} ${surfaceKind}.\n`)
}

/**
 * <lang><zh-CN>按字节收集普通文件并拒绝 symbolic link。</zh-CN><en>Collects regular files by bytes and rejects symbolic links.</en></lang>
 *
 * @param {string} root <lang><zh-CN>待摘要的公开树。</zh-CN><en>Public tree to summarize.</en></lang>
 * @returns {Array<{path: string, bytes: number, sha256: string}>} <lang><zh-CN>按 code-point path 排序的文件摘要。</zh-CN><en>File summaries sorted by code-point path.</en></lang>
 */
function summarizeTree(root) {
  const files = []
  /**
   * <lang><zh-CN>深度优先访问一个已验证目录。</zh-CN><en>Depth-first visits one validated directory.</en></lang>
   *
   * @param {string} current <lang><zh-CN>当前目录。</zh-CN><en>Current directory.</en></lang>
   * @returns {void}
   */
  const visit = (current) => {
    // <lang><zh-CN>目录项先按 name code point 排序，避免 filesystem 枚举顺序影响 evidence。</zh-CN><en>Directory entries are sorted by name code point so filesystem enumeration order cannot affect evidence.</en></lang>
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) =>
        left.name < right.name ? -1 : left.name > right.name ? 1 : 0
      )
    for (const entry of entries) {
      const entryPath = path.join(current, entry.name)
      const status = fs.lstatSync(entryPath)
      if (status.isSymbolicLink()) {
        throw new Error(
          `Showcase output contains a symbolic link: ${entry.name}`
        )
      }
      if (status.isDirectory()) visit(entryPath)
      else if (status.isFile()) {
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
  return files.sort((left, right) =>
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  )
}

/**
 * <lang><zh-CN>从文件摘要计算跨 Node 可比较的聚合指纹。</zh-CN><en>Computes an aggregate fingerprint comparable across Node versions from file summaries.</en></lang>
 *
 * @param {Array<{path: string, bytes: number, sha256: string}>} files <lang><zh-CN>确定性文件摘要。</zh-CN><en>Deterministic file summaries.</en></lang>
 * @returns {{fileCount: number, totalBytes: number, sha256: string}} <lang><zh-CN>无正文聚合摘要。</zh-CN><en>Body-free aggregate summary.</en></lang>
 */
function fingerprintFiles(files) {
  const digest = crypto.createHash('sha256')
  let totalBytes = 0
  for (const file of files) {
    totalBytes += file.bytes
    digest.update(`${file.path}\0${file.bytes}\0${file.sha256}\n`, 'utf8')
  }
  return {
    fileCount: files.length,
    totalBytes,
    sha256: digest.digest('hex')
  }
}

/**
 * <lang><zh-CN>写出公开 hub、矩阵 manifest 与同源静态资产。</zh-CN><en>Writes the public hub, matrix manifest, and same-origin static assets.</en></lang>
 *
 * @param {Object} manifest <lang><zh-CN>public-safe 展示 manifest。</zh-CN><en>Public-safe showcase manifest.</en></lang>
 * @returns {void}
 */
function writeShowcaseHub(manifest) {
  const assetRoot = path.join(topology.showcaseRoot, 'assets')
  fs.mkdirSync(assetRoot, { recursive: true })
  fs.writeFileSync(
    path.join(topology.showcaseRoot, 'index.html'),
    renderShowcaseHub(manifest),
    'utf8'
  )
  writeJson(path.join(topology.showcaseRoot, 'showcase-matrix.json'), manifest)
  fs.writeFileSync(
    path.join(assetRoot, 'showcase.css'),
    SHOWCASE_HUB_CSS,
    'utf8'
  )
  fs.writeFileSync(path.join(assetRoot, 'showcase.js'), SHOWCASE_HUB_JS, 'utf8')
}

/**
 * <lang><zh-CN>执行完整 W-P118 矩阵构建与 evidence 写入。</zh-CN><en>Runs the complete W-P118 matrix build and evidence write.</en></lang>
 *
 * @returns {Promise<void>}
 */
async function main() {
  validateNodeVersion()
  const buildCommit = validateRepositoryBoundary()
  validateOwners()
  const runtimeEntries = resolveRuntimeEntries()
  resetGeneratedRoot()
  const profiles = createShowcaseProfiles()
  // <lang><zh-CN>direct integration 以 sourceMode/skin 为键，供对应 unified Portal profile 复用；不复制 semantic IR 到 hub。</zh-CN><en>Direct integrations are keyed by sourceMode/skin for matching unified Portal profiles; semantic IR is not copied into the hub.</en></lang>
  const directIntegrations = new Map()
  // <lang><zh-CN>hia-jsdoc integration 由同一 profile 的 Portal bridge 消费。</zh-CN><en>Each hia-jsdoc integration is consumed by the Portal bridge of the same profile.</en></lang>
  const hiaJsdocIntegrations = new Map()

  try {
    for (const profile of profiles.filter(
      (candidate) => candidate.pipeline === 'jphs-jth-native'
    )) {
      const integrationPath = buildDirectProfile(
        profile,
        buildCommit,
        runtimeEntries.directJsdocEntry
      )
      directIntegrations.set(
        `${profile.sourceMode}.${profile.skin}`,
        integrationPath
      )
    }

    // <lang><zh-CN>runner 从冻结 owner commit 动态导入；模块路径不会写入其公开 producer result。</zh-CN><en>The runner is dynamically imported from the pinned owner commit; its module path is not written to the public producer result.</en></lang>
    const runnerModule = await import(
      pathToFileURL(runtimeEntries.hiaJsdocRunnerEntry).href
    )
    if (typeof runnerModule.runHiaJsdocProject !== 'function') {
      throw new Error('hia-jsdoc owner lacks runHiaJsdocProject().')
    }
    for (const profile of profiles.filter(
      (candidate) => candidate.pipeline === 'hia-jsdoc'
    )) {
      const integrationPath = buildHiaJsdocProfile(
        profile,
        buildCommit,
        runnerModule.runHiaJsdocProject
      )
      hiaJsdocIntegrations.set(profile.id, integrationPath)
    }

    // <lang><zh-CN>main owner 只构建一次；随后 18 个 Portal surface 复用同一受版本约束的 CLI。</zh-CN><en>The main owner is built once; all 18 Portal surfaces then reuse the same version-constrained CLI.</en></lang>
    runCommand(
      'mise',
      ['exec', '--', 'pnpm', 'run', 'build'],
      topology.portalRoot
    )
    if (!fs.existsSync(runtimeEntries.portalCliEntry)) {
      throw new Error('HIA Portal build did not create the CLI entry.')
    }

    for (const profile of profiles.filter(
      (candidate) => candidate.pipeline === 'hia-jsdoc'
    )) {
      const integrationPath = hiaJsdocIntegrations.get(profile.id)
      if (!integrationPath) {
        throw new Error(`${profile.id} lacks its hia-jsdoc integration.`)
      }
      buildPortalSurface(
        profile,
        'portal-bridge',
        integrationPath,
        runtimeEntries.portalCliEntry
      )
    }
    for (const profile of profiles.filter(
      (candidate) => candidate.pipeline === 'unified-portal'
    )) {
      const integrationPath = directIntegrations.get(
        `${profile.sourceMode}.${profile.skin}`
      )
      if (!integrationPath) {
        throw new Error(`${profile.id} lacks its direct integration.`)
      }
      buildPortalSurface(
        profile,
        'portal',
        integrationPath,
        runtimeEntries.portalCliEntry
      )
    }

    const manifest = createShowcaseManifest({ buildCommit, profiles })
    writeShowcaseHub(manifest)
    const files = summarizeTree(topology.showcaseRoot)
    const fingerprint = fingerprintFiles(files)
    const evidence = {
      contract: 'bp-js-cookie-documentation-showcase-build',
      contractVersion: '0.1.0-draft',
      status: 'ready-for-wp118-check',
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
      matrix: {
        profileCount: manifest.profileCount,
        surfaceCount: manifest.surfaceCount,
        defaultProfileId: manifest.defaultProfileId,
        pipelineCount: manifest.dimensions.pipelines.length,
        sourceModeCount: manifest.dimensions.sourceModes.length,
        skinCount: manifest.dimensions.skins.length,
        pageMode: manifest.dimensions.pageMode
      },
      output: {
        root: 'build/hia-docs/showcase',
        generatedTracked: false,
        ...fingerprint
      },
      privacy: PRIVACY_POLICY,
      permissions: {
        browserStack: false,
        credentialRead: false,
        networkFetchByGeneratedSite: false,
        packagePublish: false,
        targetRepositoryAccess: false,
        targetRepositoryWrite: false
      }
    }
    writeJson(path.join(topology.evidenceRoot, 'build.json'), evidence)
    writeJson(path.join(topology.evidenceRoot, 'showcase-fingerprint.json'), {
      contract: 'bp-documentation-showcase-fingerprint',
      contractVersion: '0.1.0-draft',
      buildCommit,
      node: process.versions.node,
      output: fingerprint
    })
    // <lang><zh-CN>owner build 不得产生 tracked 变化；结束前重新核对 clean boundary。</zh-CN><en>Owner builds must not create tracked changes; recheck their clean boundary before completion.</en></lang>
    validateOwners()
    process.stdout.write(
      `HIA showcase built: ${manifest.profileCount} profiles, ${manifest.surfaceCount} surfaces, ${fingerprint.fileCount} files, ${fingerprint.sha256}.\n`
    )
  } finally {
    // <lang><zh-CN>cache 可能含绝对路径、raw integration 或源码正文，无论成功失败都必须删除。</zh-CN><en>The cache may contain absolute paths, raw integrations, or source bodies and must be removed on success or failure.</en></lang>
    fs.rmSync(topology.cacheRoot, { recursive: true, force: true })
  }
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  )
  process.exitCode = 1
})

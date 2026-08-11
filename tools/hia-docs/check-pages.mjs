/**
 * <lang><zh-CN>验证 bp-docs-js-cookie 的 GitHub Pages workflow 与公开 Portal artifact。</zh-CN><en>Validates the bp-docs-js-cookie GitHub Pages workflow and public Portal artifact.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-pages-check
 * @lang zh-CN 本检查只读取 BP 仓库和 ignored 生成目录，不联网、不访问目标项目，也不启用 Pages。
 * @lang en This check reads only the BP repository and ignored output; it performs no network, target access, or Pages enablement.
 */

import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { OWNER_COMMITS, PAGES_SITE, resolveTopology } from './config.mjs'

/** @lang zh-CN 当前模块目录用于推导 BP root。 @lang en Current module directory used to derive the BP root. */
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(moduleDirectory, '..', '..')
/** @lang zh-CN 已验证的 output/owner topology。 @lang en Validated output and owner topology. */
const topology = resolveTopology(repositoryRoot)
/** @lang zh-CN 唯一允许上传的 Pages workflow。 @lang en The only Pages workflow allowed for upload. */
const workflowPath = path.join(
  repositoryRoot,
  '.github',
  'workflows',
  'hia-docs-pages.yml'
)

/** @lang zh-CN W-P111 复核过的不可变 action pin。 @lang en Immutable action pins verified by W-P111. */
const ACTION_PINS = Object.freeze({
  checkout: 'de0fac2e4500dabe0009e67214ff5f5447ce83dd',
  mise: '7e36c90d9ab29c415a2384db3006f3ec8a8cc654',
  configurePages: '45bfe0192ca1faeb007ade9deae92b16b8254a0d',
  uploadPagesArtifact: 'fc324d3547104276b827a68afc52ff2a11cc49c9',
  deployPages: 'cd2ce8fcbc39b97be8ca5fce6e763baed58fa128'
})

/**
 * <lang><zh-CN>在边界漂移时立即失败。</zh-CN><en>Fails immediately when a boundary drifts.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为真的条件。</zh-CN><en>Condition that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>公开安全的错误消息。</zh-CN><en>Public-safe error message.</en></lang>
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * <lang><zh-CN>运行只读 Git 命令。</zh-CN><en>Runs a read-only Git command.</en></lang>
 *
 * @param {string[]} args <lang><zh-CN>不经 shell 的 Git 参数。</zh-CN><en>Git arguments passed without a shell.</en></lang>
 * @returns {string} <lang><zh-CN>trim 后的 stdout。</zh-CN><en>Trimmed stdout.</en></lang>
 */
function runGit(args) {
  // <lang><zh-CN>同步只读命令让 Git identity 与当前 artifact gate 保持同一事务。</zh-CN><en>The synchronous read-only command keeps Git identity in the same artifact-gate transaction.</en></lang>
  /** @lang zh-CN 只读 Git 子进程结果。 @lang en Read-only Git child-process result. */
  const result = spawnSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false
  })
  if (result.error) throw result.error
  assert(result.status === 0, `git ${args[0]} failed.`)
  return (result.stdout || '').trim()
}

/**
 * <lang><zh-CN>遍历 artifact 并拒绝 link 或目录越界。</zh-CN><en>Walks the artifact and rejects links or directory escapes.</en></lang>
 *
 * @param {string} root <lang><zh-CN>Portal artifact 绝对根。</zh-CN><en>Absolute Portal artifact root.</en></lang>
 * @returns {Array<{path: string, bytes: number, sha256: string}>} <lang><zh-CN>稳定排序的文件摘要。</zh-CN><en>Stable, sorted file summary.</en></lang>
 */
function listArtifactFiles(root) {
  /** @type {Array<{path: string, bytes: number, sha256: string}>} */
  const files = []

  /**
   * @param {string} current <lang><zh-CN>当前已验证目录。</zh-CN><en>Current validated directory.</en></lang>
   * @returns {void}
   */
  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      /** @lang zh-CN 当前目录项绝对路径。 @lang en Absolute path of the current directory entry. */
      const entryPath = path.join(current, entry.name)
      /** @lang zh-CN 不跟随 link 的文件状态。 @lang en File status without following links. */
      const status = fs.lstatSync(entryPath)
      assert(
        !status.isSymbolicLink(),
        'Pages artifact must not contain symbolic links.'
      )
      if (entry.isDirectory()) {
        visit(entryPath)
        continue
      }
      assert(entry.isFile(), 'Pages artifact contains a non-file entry.')
      assert(status.nlink === 1, 'Pages artifact must not contain hard links.')
      /** @lang zh-CN 只用于 hash/size 的文件字节。 @lang en File bytes used only for hash and size. */
      const body = fs.readFileSync(entryPath)
      files.push({
        path: path.relative(root, entryPath).replaceAll('\\', '/'),
        bytes: body.byteLength,
        sha256: crypto.createHash('sha256').update(body).digest('hex')
      })
    }
  }

  visit(root)
  return files.sort((left, right) => left.path.localeCompare(right.path))
}

/**
 * <lang><zh-CN>验证 workflow 的 owner、action、权限和 artifact 闭集。</zh-CN><en>Validates the workflow's owner, action, permission, and artifact closed sets.</en></lang>
 *
 * @returns {{actionUseCount: number, ownerCheckoutCount: number}} <lang><zh-CN>可写入 evidence 的计数。</zh-CN><en>Counts safe for evidence.</en></lang>
 */
function validateWorkflow() {
  assert(fs.existsSync(workflowPath), 'HIA Pages workflow is missing.')
  /** @lang zh-CN workflow 源码只用于本地静态门禁。 @lang en Workflow source used only by the local static gate. */
  const workflow = fs.readFileSync(workflowPath, 'utf8')
  /** @lang zh-CN workflow 中的全部 action 引用。 @lang en Every action reference in the workflow. */
  const actionUses = [...workflow.matchAll(/uses:\s*([^\s]+)@([0-9a-f]{40})/gu)]

  assert(
    !/uses:\s*[^\s]+@(?![0-9a-f]{40}(?:\s|$))/u.test(workflow),
    'Every workflow action must use a full commit SHA.'
  )
  for (const [label, pin] of Object.entries(ACTION_PINS)) {
    assert(
      workflow.includes(`@${pin}`),
      `Workflow is missing the ${label} action pin.`
    )
  }
  for (const ownerCommit of Object.values(OWNER_COMMITS)) {
    assert(
      workflow.includes(`ref: ${ownerCommit}`),
      `Workflow is missing owner ref ${ownerCommit}.`
    )
  }

  assert(
    workflow.includes('contents: read'),
    'Workflow must retain read-only contents permission.'
  )
  assert(
    workflow.includes('pages: read'),
    'Build job must use read-only Pages permission.'
  )
  assert(
    workflow.includes('pages: write'),
    'Deploy job lacks Pages write permission.'
  )
  assert(
    workflow.includes('id-token: write'),
    'Deploy job lacks OIDC permission.'
  )
  assert(
    workflow.includes('name: github-pages'),
    'Deploy job lacks the github-pages environment.'
  )
  assert(
    workflow.includes('needs: build'),
    'Deploy job must depend on the build job.'
  )
  assert(
    workflow.includes('path: ./build/hia-docs/portal'),
    'Upload must contain only the Portal artifact root.'
  )
  assert(
    workflow.includes('HIA_DOCS_OWNER_ROOT:'),
    'Runner owner root is not explicit.'
  )
  assert(
    workflow.includes('mise exec'),
    'Workflow commands must be orchestrated by mise.'
  )
  assert(
    !/BROWSERSTACK_|NPM_TOKEN|NODE_AUTH_TOKEN|HIA_NPM_/u.test(workflow),
    'Pages workflow must not consume unrelated credentials.'
  )
  assert(
    !/gh-pages|peaceiris|JamesIves/u.test(workflow),
    'Generated-branch deployment is outside the W-P111 boundary.'
  )

  return {
    actionUseCount: actionUses.length,
    ownerCheckoutCount: Object.keys(OWNER_COMMITS).length
  }
}

/**
 * <lang><zh-CN>验证 Portal artifact 的 base-path 与公开隐私边界。</zh-CN><en>Validates the Portal artifact base-path and public privacy boundary.</en></lang>
 *
 * @param {Array<{path: string, bytes: number, sha256: string}>} files <lang><zh-CN>artifact 文件摘要。</zh-CN><en>Artifact file summary.</en></lang>
 * @param {string} buildCommit <lang><zh-CN>当前 Pages build commit。</zh-CN><en>Current Pages build commit.</en></lang>
 * @returns {{totalBytes: number, sourceLinkCount: number}} <lang><zh-CN>无正文的聚合结果。</zh-CN><en>Body-free aggregate result.</en></lang>
 */
function validateArtifact(files, buildCommit) {
  /** @lang zh-CN Pages 必须包含的入口与静态资源。 @lang en Entry point and static assets required by Pages. */
  const requiredFiles = [
    'index.html',
    'hia-manifest.json',
    'project-index.json',
    'assets/hia-default.css',
    'assets/hia-default.js'
  ]
  for (const requiredFile of requiredFiles) {
    assert(
      files.some((file) => file.path === requiredFile),
      `Pages artifact is missing ${requiredFile}.`
    )
  }

  /** @lang zh-CN 所有文件总大小，远低于 GitHub Pages 10GB 上限。 @lang en Total file size, kept far below GitHub Pages' 10GB limit. */
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0)
  assert(
    totalBytes < 10 * 1024 * 1024,
    'Bounded BP Pages artifact unexpectedly exceeds 10 MiB.'
  )

  /** @lang zh-CN 可检查文本文件拼接体，仅在内存中存在。 @lang en Combined inspectable text held only in memory. */
  const publicText = files
    .filter((file) => /\.(?:css|html|js|json)$/u.test(file.path))
    .map((file) =>
      fs.readFileSync(path.join(topology.portalOutputRoot, file.path), 'utf8')
    )
    .join('\n')
  /** @lang zh-CN Pages 根 HTML，用于 project-base 与 title 检查。 @lang en Pages root HTML used for project-base and title checks. */
  const rootHtml = fs.readFileSync(
    path.join(topology.portalOutputRoot, 'index.html'),
    'utf8'
  )
  /** @lang zh-CN exact revision 源码链接数。 @lang en Count of exact-revision source links. */
  const sourceLinkCount = (
    publicText.match(new RegExp(`/blob/${buildCommit}/`, 'gu')) || []
  ).length

  assert(
    rootHtml.includes('bp-docs-js-cookie 文档工程'),
    'Pages root lacks the derivative documentation-engineering title.'
  )
  assert(
    (rootHtml.match(/data-hia-project-entry=/gu) || []).length === 18,
    'Pages root must retain all 18 entries as no-script single-page content.'
  )
  assert(
    rootHtml.includes('href="assets/hia-default.css"'),
    'Stylesheet URL is not project-relative.'
  )
  assert(
    rootHtml.includes('src="assets/hia-default.js"'),
    'Script URL is not project-relative.'
  )
  assert(
    !/(?:href|src)="\/(?!\/)/u.test(rootHtml),
    'Pages root contains a root-absolute asset URL.'
  )
  assert(
    !/fetch\(["']\//u.test(rootHtml),
    'Pages runtime contains a root-absolute data URL.'
  )
  assert(
    new URL(
      'assets/hia-default.css',
      PAGES_SITE.canonicalUrl
    ).pathname.startsWith(PAGES_SITE.projectBasePath),
    'Stylesheet does not resolve under the project base path.'
  )
  assert(
    sourceLinkCount >= 18,
    'Pages artifact lacks exact-revision source links.'
  )
  assert(
    !/\/blob\/(?:main|master|latest)\//u.test(publicText),
    'Pages artifact contains a floating source link.'
  )
  assert(
    !/(?:[A-Za-z]:[\\/](?:Users|Project)|\/home\/runner\/work\/)/u.test(
      publicText
    ),
    'Pages artifact contains an absolute host path.'
  )
  assert(
    !/"(?:sourceBody|sourceText|sourcesContent|rawComment|credential|secretValue)"\s*:/u.test(
      publicText
    ),
    'Pages artifact contains a blocked body or credential carrier.'
  )
  assert(
    !/(?:ghp_|github_pat_|npm_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/u.test(
      publicText
    ),
    'Pages artifact contains a credential-shaped marker.'
  )
  assert(
    !/(?:analytics|telemetry|google-analytics|googletagmanager)/iu.test(
      publicText
    ),
    'Pages artifact contains analytics or telemetry.'
  )

  return { totalBytes, sourceLinkCount }
}

/**
 * <lang><zh-CN>执行 W-P111 本地 Pages readiness gate。</zh-CN><en>Runs the W-P111 local Pages-readiness gate.</en></lang>
 *
 * @returns {void}
 */
function main() {
  assert(
    fs.existsSync(topology.portalOutputRoot),
    'Portal output is missing; run the documentation build first.'
  )
  /** @lang zh-CN 当前 exact BP commit，同时也是 source-link revision。 @lang en Current exact BP commit and source-link revision. */
  const buildCommit = runGit(['rev-parse', 'HEAD'])
  assert(
    /^[0-9a-f]{40}$/u.test(buildCommit),
    'Pages build commit must be a full Git SHA.'
  )
  /** @lang zh-CN workflow 静态门禁摘要。 @lang en Static workflow-gate summary. */
  const workflow = validateWorkflow()
  /** @lang zh-CN 无 link 的 Portal artifact 文件摘要。 @lang en Link-free Portal artifact file summary. */
  const files = listArtifactFiles(topology.portalOutputRoot)
  /** @lang zh-CN artifact base-path/privacy 摘要。 @lang en Artifact base-path and privacy summary. */
  const artifact = validateArtifact(files, buildCommit)
  /** @lang zh-CN 按路径/hash 聚合的稳定 artifact digest。 @lang en Stable artifact digest aggregated from paths and hashes. */
  const artifactSha256 = crypto
    .createHash('sha256')
    .update(files.map((file) => `${file.path}\0${file.sha256}`).join('\n'))
    .digest('hex')

  /** @lang zh-CN count/status-only 本地 Pages readiness evidence。 @lang en Count/status-only local Pages-readiness evidence. */
  const evidence = {
    contract: 'bp-js-cookie-pages-artifact-check',
    contractVersion: '0.1.0-draft',
    status: 'ready-for-pages-deployment',
    buildCommit,
    owners: OWNER_COMMITS,
    pages: PAGES_SITE,
    artifact: {
      root: 'build/hia-docs/portal',
      portalOnly: true,
      generatedTracked: false,
      fileCount: files.length,
      totalBytes: artifact.totalBytes,
      sha256: artifactSha256,
      symbolicLinkCount: 0,
      hardLinkCount: 0
    },
    workflow: {
      path: '.github/workflows/hia-docs-pages.yml',
      ...workflow,
      immutableActionPins: Object.keys(ACTION_PINS).length,
      generatedBranchCommit: false,
      miseManaged: true
    },
    privacy: {
      sourceContentPolicy: 'none',
      sourceLinkCount: artifact.sourceLinkCount,
      unpinnedSourceLinkCount: 0,
      rootAbsoluteAssetUrlCount: 0,
      absolutePathLeakCount: 0,
      sourceBodyLeakCount: 0,
      credentialLeakCount: 0,
      analyticsOrTelemetryCount: 0
    },
    permissions: {
      pagesEnablementPerformedByCheck: false,
      network: false,
      packagePublish: false,
      targetRepositoryAccess: false,
      targetRepositoryWrite: false,
      wp112Authorized: false
    }
  }
  /** @lang zh-CN evidence 仍位于 ignored build root。 @lang en Evidence remains under the ignored build root. */
  const evidencePath = path.join(topology.evidenceRoot, 'pages.json')
  fs.mkdirSync(topology.evidenceRoot, { recursive: true })
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  )
  process.stdout.write(
    `${JSON.stringify({ status: evidence.status, fileCount: files.length, sourceLinkCount: artifact.sourceLinkCount, privacyLeakCount: 0 })}\n`
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

/**
 * <lang><zh-CN>验证 bp-docs-js-cookie 展示矩阵的 GitHub Pages artifact 与 workflow 边界。</zh-CN><en>Validates the GitHub Pages artifact and workflow boundary for the bp-docs-js-cookie showcase matrix.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-pages-check
 * @lang zh-CN 本检查不启用 Pages、不访问网络、不读取 credential，只验证待上传 showcase tree 与仓库内 workflow。
 * @lang en This check does not enable Pages, access the network, or read credentials; it validates only the pending showcase tree and repository workflow.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  DOCUMENTATION_NODE_VERSIONS,
  OWNER_COMMITS,
  PAGES_SITE,
  createShowcaseProfiles,
  resolveTopology
} from './config.mjs'

/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)
/** @lang zh-CN 待上传 artifact topology。 @lang en Topology of the pending upload artifact. */
const topology = resolveTopology(repositoryRoot)
/** @lang zh-CN workflow 的固定仓库相对路径。 @lang en Fixed repository-relative workflow path. */
const workflowPath = path.join(
  repositoryRoot,
  '.github',
  'workflows',
  'hia-docs-pages.yml'
)
/** @lang zh-CN Pages workflow 允许的 immutable action pins。 @lang en Immutable action pins allowed in the Pages workflow. */
const ACTION_PINS = Object.freeze({
  'actions/checkout': 'de0fac2e4500dabe0009e67214ff5f5447ce83dd',
  'jdx/mise-action': '7e36c90d9ab29c415a2384db3006f3ec8a8cc654',
  'actions/configure-pages': '45bfe0192ca1faeb007ade9deae92b16b8254a0d',
  'actions/upload-pages-artifact': 'fc324d3547104276b827a68afc52ff2a11cc49c9',
  'actions/deploy-pages': 'cd2ce8fcbc39b97be8ca5fce6e763baed58fa128'
})

/**
 * <lang><zh-CN>断言 Pages 门禁条件。</zh-CN><en>Asserts a Pages-gate condition.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为真的条件。</zh-CN><en>Condition that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>公开安全的失败说明。</zh-CN><en>Public-safe failure message.</en></lang>
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * <lang><zh-CN>解析一个 UTF-8 JSON 文件。</zh-CN><en>Parses one UTF-8 JSON file.</en></lang>
 *
 * @param {string} filePath <lang><zh-CN>绝对路径。</zh-CN><en>Absolute path.</en></lang>
 * @returns {Object} <lang><zh-CN>已解析对象。</zh-CN><en>Parsed object.</en></lang>
 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/**
 * <lang><zh-CN>枚举 Pages artifact 中的普通文件并验证 link boundary。</zh-CN><en>Enumerates regular files in the Pages artifact and validates the link boundary.</en></lang>
 *
 * @param {string} root <lang><zh-CN>showcase artifact root。</zh-CN><en>Showcase artifact root.</en></lang>
 * @returns {{files:string[],symbolicLinkCount:number,hardLinkCount:number,totalBytes:number}} <lang><zh-CN>无正文 artifact 摘要。</zh-CN><en>Body-free artifact summary.</en></lang>
 */
function inspectArtifact(root) {
  const files = []
  let symbolicLinkCount = 0
  let hardLinkCount = 0
  let totalBytes = 0
  /**
   * <lang><zh-CN>递归访问一个 artifact 目录。</zh-CN><en>Recursively visits one artifact directory.</en></lang>
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
      if (status.isSymbolicLink()) {
        symbolicLinkCount += 1
        continue
      }
      if (status.isDirectory()) visit(entryPath)
      else if (status.isFile()) {
        files.push(entryPath)
        totalBytes += status.size
        if (status.nlink > 1) hardLinkCount += 1
      }
    }
  }
  visit(root)
  return { files, symbolicLinkCount, hardLinkCount, totalBytes }
}

/**
 * <lang><zh-CN>验证 content-addressed source asset 的路径、字节数与 SHA-384。</zh-CN><en>Validates a content-addressed source asset's path, byte length, and SHA-384.</en></lang>
 *
 * @param {string} surfaceRoot <lang><zh-CN>surface 根。</zh-CN><en>Surface root.</en></lang>
 * @param {Object} asset <lang><zh-CN>presentation profile asset metadata。</zh-CN><en>Presentation-profile asset metadata.</en></lang>
 * @returns {void}
 */
function checkSourceAsset(surfaceRoot, asset) {
  assert(
    /^sources\/[a-f0-9]{64}\.txt$/u.test(asset.relativeUrl),
    'Source asset URL is not safe and content-addressed.'
  )
  const assetPath = path.resolve(surfaceRoot, asset.relativeUrl)
  const boundary = path.relative(surfaceRoot, assetPath)
  assert(
    !boundary.startsWith('..') && !path.isAbsolute(boundary),
    'Source asset escaped its surface root.'
  )
  assert(
    fs.existsSync(assetPath),
    'Presentation profile references a missing asset.'
  )
  const body = fs.readFileSync(assetPath)
  assert(
    body.byteLength === asset.byteLength,
    'Source asset byte length drifted.'
  )
  const sha384 = crypto.createHash('sha384').update(body).digest('base64')
  assert(
    asset.digest?.algorithm === 'sha384' && asset.digest?.value === sha384,
    'Source asset SHA-384 drifted.'
  )
}

/**
 * <lang><zh-CN>验证所有 surface 的 Pages route 与源码资产可部署性。</zh-CN><en>Validates Pages-route and source-asset deployability for all surfaces.</en></lang>
 *
 * @param {Object[]} profiles <lang><zh-CN>冻结矩阵 profiles。</zh-CN><en>Frozen matrix profiles.</en></lang>
 * @returns {{surfaceCount:number,sourceAssetCount:number}} <lang><zh-CN>Pages surface 摘要。</zh-CN><en>Pages surface summary.</en></lang>
 */
function checkSurfaceRoutes(profiles) {
  let surfaceCount = 0
  let sourceAssetCount = 0
  for (const profile of profiles) {
    for (const surface of profile.surfaces) {
      assert(
        /^[a-z0-9][a-z0-9./_-]*\/$/u.test(surface.path) &&
          !surface.path.includes('..'),
        `${profile.id} has an unsafe Pages route.`
      )
      const surfaceRoot = path.resolve(topology.showcaseRoot, surface.path)
      assert(
        fs.existsSync(path.join(surfaceRoot, 'index.html')),
        `${profile.id}/${surface.kind} lacks a Pages entry.`
      )
      const presentation = readJson(
        path.join(surfaceRoot, 'documentation-presentation-profile.json')
      )
      for (const asset of presentation.source?.assets ?? []) {
        if (asset.relativeUrl !== undefined) {
          checkSourceAsset(surfaceRoot, asset)
          sourceAssetCount += 1
        }
      }
      surfaceCount += 1
    }
  }
  return { surfaceCount, sourceAssetCount }
}

/**
 * <lang><zh-CN>验证 workflow 的 immutable actions、owner pin、mise 与最小权限。</zh-CN><en>Validates immutable actions, owner pins, mise, and least privilege in the workflow.</en></lang>
 *
 * @param {string} workflow <lang><zh-CN>workflow YAML 文本。</zh-CN><en>Workflow YAML text.</en></lang>
 * @returns {{actionUseCount:number,ownerCheckoutCount:number,nodeBuildCount:number}} <lang><zh-CN>无 secret workflow 摘要。</zh-CN><en>Secret-free workflow summary.</en></lang>
 */
function checkWorkflow(workflow) {
  const uses = [
    ...workflow.matchAll(/^\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gmu)
  ].map((match) => match[1])
  assert(uses.length === 9, 'Workflow action-use count drifted.')
  for (const use of uses) {
    const separator = use.lastIndexOf('@')
    const action = use.slice(0, separator)
    const revision = use.slice(separator + 1)
    assert(
      ACTION_PINS[action] === revision,
      `Workflow action pin drifted: ${action}.`
    )
  }
  assert(
    !/^\s*pull_request:/mu.test(workflow),
    'Workflow must not run on pull_request.'
  )
  assert(
    workflow.includes('persist-credentials: false'),
    'Workflow checkout credentials are not disabled.'
  )
  assert(
    (workflow.match(/persist-credentials:\s*false/gu) || []).length === 5,
    'Not every checkout disables persisted credentials.'
  )
  assert(
    workflow.includes(`ref: ${OWNER_COMMITS.plugin}`) &&
      workflow.includes(`ref: ${OWNER_COMMITS.theme}`) &&
      workflow.includes(`ref: ${OWNER_COMMITS.hiaJsdoc}`) &&
      workflow.includes(`ref: ${OWNER_COMMITS.portal}`),
    'Workflow owner commit pin drifted.'
  )
  assert(
    workflow.includes('repository: mandolin/hia-jsdoc') &&
      workflow.includes('working-directory: .hia-docs-owners/HIA/hia-jsdoc'),
    'Workflow does not install the pinned hia-jsdoc workspace.'
  )
  assert(
    workflow.includes('npm ci --ignore-scripts --no-audit --no-fund'),
    'Workflow lacks the isolated npm ci policy.'
  )
  assert(
    workflow.includes(
      'pnpm --dir .hia-docs-owners/main-repo install --frozen-lockfile'
    ),
    'Workflow lacks the Portal frozen-lock install.'
  )
  assert(
    workflow.includes(
      'mise exec node@22.23.0 -- node tools/hia-docs/build.mjs'
    ) &&
      workflow.includes(
        'mise exec node@24.12.0 -- node tools/hia-docs/build.mjs'
      ),
    'Workflow lacks both deterministic Node builds.'
  )
  assert(
    workflow.includes('node --test tools/hia-docs/showcase.test.mjs') &&
      workflow.includes('node tools/hia-docs/check.mjs') &&
      workflow.includes('node tools/hia-docs/check-determinism.mjs') &&
      workflow.includes('node tools/hia-docs/check-pages.mjs'),
    'Workflow lacks one or more showcase gates.'
  )
  assert(
    workflow.includes('path: ./build/hia-docs/showcase') &&
      !workflow.includes('path: ./build/hia-docs/portal'),
    'Workflow does not upload the showcase-only root.'
  )
  assert(
    workflow.includes('contents: read') &&
      workflow.includes('pages: write') &&
      workflow.includes('id-token: write'),
    'Workflow permissions drifted.'
  )
  assert(
    !/npm\s+(publish|token|login)|NODE_AUTH_TOKEN|NPM_TOKEN/iu.test(workflow),
    'Workflow contains a package-publish or registry-credential path.'
  )
  return {
    actionUseCount: uses.length,
    ownerCheckoutCount: 4,
    nodeBuildCount: 2
  }
}

/**
 * <lang><zh-CN>验证隔离 JSDoc runtime 的 exact dependency 与 lock。</zh-CN><en>Validates the isolated JSDoc runtime's exact dependency and lock.</en></lang>
 *
 * @returns {{jsdocVersion:string,lockfileVersion:number}} <lang><zh-CN>公开安全的 runtime 摘要。</zh-CN><en>Public-safe runtime summary.</en></lang>
 */
function checkDocumentationRuntime() {
  const runtimeRoot = path.join(repositoryRoot, 'tools', 'hia-docs', 'runtime')
  const manifest = readJson(path.join(runtimeRoot, 'package.json'))
  const lock = readJson(path.join(runtimeRoot, 'package-lock.json'))
  assert(
    manifest.private === true,
    'Documentation runtime must remain private.'
  )
  assert(
    manifest.devDependencies?.jsdoc === '4.0.5',
    'Documentation JSDoc version drifted.'
  )
  assert(
    lock.lockfileVersion === 3,
    'Documentation runtime lockfile version drifted.'
  )
  assert(
    lock.packages?.['node_modules/jsdoc']?.version === '4.0.5',
    'Documentation runtime lock does not pin JSDoc 4.0.5.'
  )
  return { jsdocVersion: '4.0.5', lockfileVersion: lock.lockfileVersion }
}

/**
 * <lang><zh-CN>执行 Pages artifact/workflow 验收并写 ignored evidence。</zh-CN><en>Runs Pages artifact/workflow acceptance and writes ignored evidence.</en></lang>
 *
 * @returns {void}
 */
function main() {
  assert(
    DOCUMENTATION_NODE_VERSIONS.includes(process.versions.node),
    'Pages checker Node version is outside the documentation support window.'
  )
  assert(fs.existsSync(workflowPath), 'Pages workflow is missing.')
  assert(
    fs.existsSync(path.join(topology.showcaseRoot, 'index.html')),
    'Showcase Pages artifact is missing.'
  )
  const artifact = inspectArtifact(topology.showcaseRoot)
  assert(
    artifact.symbolicLinkCount === 0,
    'Pages artifact contains symbolic links.'
  )
  assert(artifact.hardLinkCount === 0, 'Pages artifact contains hard links.')
  assert(artifact.files.length > 36, 'Pages artifact is unexpectedly small.')
  assert(
    artifact.totalBytes < 1024 * 1024 * 1024,
    'Pages artifact exceeds 1 GiB.'
  )

  const profiles = createShowcaseProfiles()
  const surfaces = checkSurfaceRoutes(profiles)
  assert(surfaces.surfaceCount === 36, 'Pages surface count drifted.')
  assert(surfaces.sourceAssetCount > 0, 'Pages artifact lacks source assets.')
  const workflow = checkWorkflow(fs.readFileSync(workflowPath, 'utf8'))
  const documentationRuntime = checkDocumentationRuntime()
  const offlineEvidence = readJson(
    path.join(topology.evidenceRoot, 'check.json')
  )
  assert(
    offlineEvidence.status === 'offline-verified',
    'Offline evidence is not ready.'
  )

  const evidence = {
    contract: 'bp-js-cookie-documentation-showcase-pages-check',
    contractVersion: '0.1.0-draft',
    status: 'pages-artifact-verified',
    pages: PAGES_SITE,
    artifact: {
      root: 'build/hia-docs/showcase',
      showcaseOnly: true,
      generatedTracked: false,
      fileCount: artifact.files.length,
      totalBytes: artifact.totalBytes,
      symbolicLinkCount: artifact.symbolicLinkCount,
      hardLinkCount: artifact.hardLinkCount,
      profileCount: profiles.length,
      surfaceCount: surfaces.surfaceCount,
      verifiedSourceAssetCount: surfaces.sourceAssetCount
    },
    workflow: {
      path: '.github/workflows/hia-docs-pages.yml',
      ...workflow,
      immutableActionPinCount: Object.keys(ACTION_PINS).length,
      generatedBranchCommit: false,
      miseManaged: true,
      finalArtifactRuntime: '24.12.0'
    },
    documentationRuntime: {
      isolatedFromRootPackage: true,
      isolatedFromOwnerPackages: true,
      registry: 'https://registry.npmjs.org/',
      ...documentationRuntime
    },
    permissions: {
      pagesEnablementPerformedByCheck: false,
      network: false,
      packagePublish: false,
      credentialRead: false,
      targetRepositoryAccess: false,
      targetRepositoryWrite: false
    }
  }
  fs.writeFileSync(
    path.join(topology.evidenceRoot, 'pages.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  )
  process.stdout.write(
    `${JSON.stringify({ status: evidence.status, fileCount: artifact.files.length, profileCount: profiles.length, surfaceCount: surfaces.surfaceCount, verifiedSourceAssetCount: surfaces.sourceAssetCount, privacyLeakCount: 0 })}\n`
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

/**
 * <lang><zh-CN>验证 bp-docs-js-cookie 默认 Portal 产品的 GitHub Pages artifact 与 workflow 边界。</zh-CN><en>Validates the GitHub Pages artifact and workflow boundary for the bp-docs-js-cookie default Portal product.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-pages-check
 * @lang zh-CN 本检查不启用 Pages、不访问网络、不读取 credential，只验证待上传 public tree 与仓库内 workflow；完整矩阵由 check.mjs 独立验收。
 * @lang en This check does not enable Pages, access the network, or read credentials; it validates only the pending public tree and repository workflow, while check.mjs independently accepts the full matrix.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  DEFAULT_SHOWCASE_PROFILE_ID,
  DOCUMENTATION_NODE_VERSIONS,
  OWNER_COMMITS,
  PAGES_SITE,
  resolveTopology
} from './config.mjs'
import {
  PUBLICATION_BASELINE_ID,
  PUBLICATION_PROFILE_CONTRACT
} from './public-artifact.mjs'

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
 * @param {string} root <lang><zh-CN>public artifact root。</zh-CN><en>Public artifact root.</en></lang>
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
 * <lang><zh-CN>验证唯一默认 Portal surface、发布 manifest 与源码资产可部署性。</zh-CN><en>Validates the sole default Portal surface, publication manifest, and source-asset deployability.</en></lang>
 *
 * @returns {{profileCount:number,surfaceCount:number,sourceAssetCount:number,manifest:Object}} <lang><zh-CN>Pages 产品摘要。</zh-CN><en>Pages product summary.</en></lang>
 */
function checkPublicSurface() {
  const manifest = readJson(
    path.join(
      topology.publicArtifactRoot,
      'documentation-publication-profile.json'
    )
  )
  assert(
    manifest.contract === PUBLICATION_PROFILE_CONTRACT,
    'Publication-profile contract drifted.'
  )
  assert(
    manifest.designBaseline?.id === PUBLICATION_BASELINE_ID &&
      manifest.designBaseline?.status === 'maintainer-confirmed',
    'Publication design baseline drifted.'
  )
  assert(
    manifest.publicProfileCount === 1 &&
      manifest.localCiCoverageProfileCount === 27 &&
      manifest.rootIsProfileChooser === false,
    'Publication profile separation drifted.'
  )
  assert(
    manifest.defaultProfile?.id === DEFAULT_SHOWCASE_PROFILE_ID,
    'Public default profile drifted.'
  )
  assert(
    JSON.stringify(manifest.informationArchitecture) ===
      JSON.stringify([
        'global-header',
        'primary-sidebar',
        'breadcrumb',
        'main-topic',
        'local-outline',
        'footer-relations'
      ]),
    'Public information architecture drifted from the design baseline.'
  )
  assert(
    JSON.stringify(manifest.displaySettings?.siteThemes) ===
      JSON.stringify(['system', 'light', 'dark']) &&
      manifest.displaySettings?.siteThemeDefault === 'light' &&
      manifest.displaySettings?.codeThemes?.length === 6 &&
      manifest.displaySettings?.codeRuntime ===
        'prismjs-1.30.0-after-verified-source' &&
      manifest.displaySettings?.highlighter?.license === 'MIT' &&
      manifest.displaySettings?.highlighter?.verifiedSourceRequired === true &&
      manifest.apiScope?.default === 'public' &&
      manifest.apiScope?.publicEntryCount === 7 &&
      manifest.apiScope?.allEntryCount === 18 &&
      manifest.displaySettings?.contentVisibilityDefaults?.metadata ===
        'hide' &&
      manifest.displaySettings?.contentVisibilityDefaults?.contract === 'show',
    'Public display-settings contract drifted.'
  )

  const presentation = readJson(
    path.join(
      topology.publicArtifactRoot,
      'documentation-presentation-profile.json'
    )
  )
  assert(
    presentation.pagePartition?.mode === 'multi-page',
    'Public Portal is not multi-page.'
  )
  assert(
    presentation.source?.mode === 'fetch',
    'Public Portal is not fetch mode.'
  )
  assert(
    presentation.theme?.skinId === 'portal.classic',
    'Public Portal default skin drifted.'
  )

  let sourceAssetCount = 0
  for (const asset of presentation.source?.assets ?? []) {
    if (asset.relativeUrl !== undefined) {
      checkSourceAsset(topology.publicArtifactRoot, asset)
      sourceAssetCount += 1
    }
  }
  return { profileCount: 1, surfaceCount: 1, sourceAssetCount, manifest }
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
    workflow.includes(
      'node --test tools/hia-docs/public-artifact.test.mjs tools/hia-docs/showcase.test.mjs'
    ) &&
      workflow.includes('node tools/hia-docs/check.mjs') &&
      workflow.includes('node tools/hia-docs/check-determinism.mjs') &&
      workflow.includes('node tools/hia-docs/check-pages.mjs'),
    'Workflow lacks one or more showcase gates.'
  )
  assert(
    workflow.includes('path: ./build/hia-docs/public') &&
      !workflow.includes('path: ./build/hia-docs/showcase') &&
      !workflow.includes('path: ./build/hia-docs/portal'),
    'Workflow does not upload only the public default-Portal root.'
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
 * <lang><zh-CN>验证隔离文档 runtime 的 JSDoc/Prism exact dependencies 与 lock。</zh-CN><en>Validates exact JSDoc/Prism dependencies and lock state in the isolated documentation runtime.</en></lang>
 *
 * @returns {{jsdocVersion:string,prismVersion:string,lockfileVersion:number}} <lang><zh-CN>公开安全的 runtime 摘要。</zh-CN><en>Public-safe runtime summary.</en></lang>
 */
function checkDocumentationRuntime() {
  const runtimeRoot = path.join(repositoryRoot, 'tools', 'hia-docs', 'runtime')
  const manifest = readJson(path.join(runtimeRoot, 'package.json'))
  const lock = readJson(path.join(runtimeRoot, 'package-lock.json'))
  /** @lang zh-CN prismManifest 用于核对包内声明的许可证；npm lock v3 不重复记录该字段。 @lang en PrismManifest checks the package-declared license because npm lock v3 does not repeat that field. */
  const prismManifest = readJson(
    path.join(runtimeRoot, 'node_modules', 'prismjs', 'package.json')
  )
  assert(
    manifest.private === true,
    'Documentation runtime must remain private.'
  )
  assert(
    manifest.devDependencies?.jsdoc === '4.0.5',
    'Documentation JSDoc version drifted.'
  )
  assert(
    manifest.devDependencies?.prismjs === '1.30.0',
    'Documentation Prism version drifted.'
  )
  assert(
    lock.lockfileVersion === 3,
    'Documentation runtime lockfile version drifted.'
  )
  assert(
    lock.packages?.['node_modules/jsdoc']?.version === '4.0.5',
    'Documentation runtime lock does not pin JSDoc 4.0.5.'
  )
  assert(
    lock.packages?.['node_modules/prismjs']?.version === '1.30.0' &&
      prismManifest.version === '1.30.0' &&
      prismManifest.license === 'MIT',
    'Documentation runtime lock does not pin MIT-licensed Prism 1.30.0.'
  )
  return {
    jsdocVersion: '4.0.5',
    prismVersion: '1.30.0',
    lockfileVersion: lock.lockfileVersion
  }
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
    fs.existsSync(path.join(topology.publicArtifactRoot, 'index.html')),
    'Public default-Portal artifact is missing.'
  )
  const artifact = inspectArtifact(topology.publicArtifactRoot)
  assert(
    artifact.symbolicLinkCount === 0,
    'Pages artifact contains symbolic links.'
  )
  assert(artifact.hardLinkCount === 0, 'Pages artifact contains hard links.')
  assert(artifact.files.length > 20, 'Pages artifact is unexpectedly small.')
  assert(
    artifact.totalBytes < 1024 * 1024 * 1024,
    'Pages artifact exceeds 1 GiB.'
  )

  const publicSurface = checkPublicSurface()
  assert(publicSurface.surfaceCount === 1, 'Pages surface count drifted.')
  assert(
    publicSurface.sourceAssetCount > 0,
    'Pages artifact lacks source assets.'
  )
  assert(
    !fs.existsSync(path.join(topology.publicArtifactRoot, 'profiles')) &&
      !fs.existsSync(
        path.join(topology.publicArtifactRoot, 'showcase-matrix.json')
      ) &&
      !fs.existsSync(
        path.join(topology.publicArtifactRoot, 'assets', 'showcase.js')
      ),
    'Public artifact contains the local/CI chooser or unused profiles.'
  )
  const rootHtml = fs.readFileSync(
    path.join(topology.publicArtifactRoot, 'index.html'),
    'utf8'
  )
  assert(
    rootHtml.includes('hia-project-split-site') &&
      rootHtml.includes('data-hia-skin-control') &&
      rootHtml.includes('data-hia-public-product') &&
      rootHtml.includes('data-hia-settings-dialog') &&
      rootHtml.includes('data-hia-search-dialog') &&
      rootHtml.includes('data-hia-public-outline') &&
      rootHtml.includes('data-hia-public-footer') &&
      rootHtml.includes('代码区域 / 编辑器设置') &&
      rootHtml.includes('只显示接口 API') &&
      rootHtml.includes('data-hia-api-scope="public"') &&
      rootHtml.includes('assets/prism.js') &&
      !rootHtml.includes('data-showcase-profile=') &&
      !rootHtml.includes('candidate-status-strip'),
    'Public root is not the direct default Portal product.'
  )
  const productCss = fs.readFileSync(
    path.join(topology.publicArtifactRoot, 'assets', 'hia-public-product.css'),
    'utf8'
  )
  const productJs = fs.readFileSync(
    path.join(topology.publicArtifactRoot, 'assets', 'hia-public-product.js'),
    'utf8'
  )
  assert(
    productCss.includes('@media (max-width: 760px)') &&
      productCss.includes('@media print') &&
      productCss.includes('@media (forced-colors: active)'),
    'Public product CSS lacks responsive, print, or forced-colors handling.'
  )
  assert(
    productJs.includes("'hia.bp-docs-js-cookie.display.v2'") &&
      productJs.includes('localStorage.setItem') &&
      productJs.includes("details.dataset.hiaSourceState !== 'ready'") &&
      productJs.includes('globalThis.Prism.highlightElement(code)') &&
      !/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(/u.test(
        productJs
      ),
    'Public product runtime drifted from the device-local, no-network boundary.'
  )
  assert(
    fs.existsSync(
      path.join(topology.publicArtifactRoot, 'assets', 'prism.js')
    ) &&
      fs.existsSync(
        path.join(
          topology.publicArtifactRoot,
          'assets',
          'prism-line-numbers.js'
        )
      ) &&
      fs.existsSync(
        path.join(topology.publicArtifactRoot, 'assets', 'prism-LICENSE.txt')
      ),
    'Pinned local Prism assets or license are missing.'
  )
  for (const filePath of artifact.files.filter((candidate) =>
    /\.(?:html|json|js|css)$/u.test(candidate)
  )) {
    const contents = fs.readFileSync(filePath, 'utf8')
    assert(
      !/[A-Za-z]:\\|\/home\/runner\/|\/Users\//u.test(contents),
      'Public artifact contains a host-absolute path.'
    )
    assert(
      !/(?:NODE_AUTH_TOKEN|NPM_TOKEN|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY)/u.test(
        contents
      ),
      'Public artifact contains a credential marker.'
    )
  }
  const workflow = checkWorkflow(fs.readFileSync(workflowPath, 'utf8'))
  const documentationRuntime = checkDocumentationRuntime()
  const offlineEvidence = readJson(
    path.join(topology.evidenceRoot, 'check.json')
  )
  assert(
    offlineEvidence.status === 'offline-verified' &&
      offlineEvidence.matrix?.profileCount === 27 &&
      offlineEvidence.matrix?.surfaceCount === 36,
    'Local/CI matrix evidence is not ready.'
  )
  const publicBuildEvidence = readJson(
    path.join(topology.evidenceRoot, 'public-build.json')
  )
  assert(
    publicBuildEvidence.status === 'ready-for-wp121-check' &&
      publicBuildEvidence.publication?.buildCommit ===
        publicSurface.manifest.buildCommit,
    'Public build evidence is not ready.'
  )

  const evidence = {
    contract: 'bp-js-cookie-documentation-public-pages-check',
    contractVersion: '0.1.0-draft',
    status: 'pages-artifact-verified',
    pages: PAGES_SITE,
    artifact: {
      root: 'build/hia-docs/public',
      defaultPortalOnly: true,
      generatedTracked: false,
      fileCount: artifact.files.length,
      totalBytes: artifact.totalBytes,
      symbolicLinkCount: artifact.symbolicLinkCount,
      hardLinkCount: artifact.hardLinkCount,
      profileCount: publicSurface.profileCount,
      localCiCoverageProfileCount: offlineEvidence.matrix.profileCount,
      surfaceCount: publicSurface.surfaceCount,
      verifiedSourceAssetCount: publicSurface.sourceAssetCount,
      chooserIncluded: false,
      unusedProfilesIncluded: false
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
    `${JSON.stringify({ status: evidence.status, fileCount: artifact.files.length, profileCount: publicSurface.profileCount, localCiCoverageProfileCount: offlineEvidence.matrix.profileCount, surfaceCount: publicSurface.surfaceCount, verifiedSourceAssetCount: publicSurface.sourceAssetCount, privacyLeakCount: 0 })}\n`
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

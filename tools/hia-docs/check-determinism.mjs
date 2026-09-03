/**
 * <lang><zh-CN>比较 Node 22 与 Node 24 生成的本地矩阵及公开默认 Portal 聚合指纹。</zh-CN><en>Compares aggregate fingerprints of the local matrix and public default Portal produced by Node 22 and Node 24.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-determinism-check
 * @lang zh-CN baseline 文件必须由调用方在第二次 build 清理范围外暂存；checker 不复制正文或文件列表。
 * @lang en The caller must stage the baseline outside the second build's cleanup boundary; the checker copies no bodies or file lists.
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { resolveTopology } from './config.mjs'

/** @lang zh-CN BP repository root。 @lang en BP repository root. */
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
)
/** @lang zh-CN 当前 Node 24 build 的 evidence topology。 @lang en Evidence topology for the current Node 24 build. */
const topology = resolveTopology(repositoryRoot)

/**
 * <lang><zh-CN>断言确定性门禁条件。</zh-CN><en>Asserts a determinism-gate condition.</en></lang>
 *
 * @param {unknown} condition <lang><zh-CN>必须为真的条件。</zh-CN><en>Condition that must be truthy.</en></lang>
 * @param {string} message <lang><zh-CN>安全诊断。</zh-CN><en>Safe diagnostic.</en></lang>
 * @returns {asserts condition}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message)
}

/**
 * <lang><zh-CN>读取一个 fingerprint evidence。</zh-CN><en>Reads one fingerprint evidence file.</en></lang>
 *
 * @param {string} filePath <lang><zh-CN>调用方提供或当前 build 生成的路径。</zh-CN><en>Caller-supplied or current-build-generated path.</en></lang>
 * @returns {Object} <lang><zh-CN>已验证前的 JSON 对象。</zh-CN><en>JSON object before validation.</en></lang>
 */
function readFingerprint(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

/**
 * <lang><zh-CN>比较暂存的 Node 22 baseline 与当前 Node 24 结果。</zh-CN><en>Compares the staged Node 22 baseline with the current Node 24 result.</en></lang>
 *
 * @returns {void}
 */
function main() {
  // <lang><zh-CN>两个 baseline 必须来自同一次 Node 22 build，缺一不可。</zh-CN><en>Both baselines must come from the same Node 22 build; neither is optional.</en></lang>
  const baselineShowcaseArgument = process.argv[2]
  const baselinePublicArgument = process.argv[3]
  assert(
    baselineShowcaseArgument && baselinePublicArgument,
    'Staged Node 22 showcase and public fingerprint paths are required.'
  )
  const baselineShowcasePath = path.resolve(
    repositoryRoot,
    baselineShowcaseArgument
  )
  const baselinePublicPath = path.resolve(repositoryRoot, baselinePublicArgument)
  const currentShowcasePath = path.join(
    topology.evidenceRoot,
    'showcase-fingerprint.json'
  )
  const currentPublicPath = path.join(
    topology.evidenceRoot,
    'public-fingerprint.json'
  )
  assert(
    fs.existsSync(baselineShowcasePath) && fs.existsSync(baselinePublicPath),
    'A staged Node 22 fingerprint is missing.'
  )
  assert(
    fs.existsSync(currentShowcasePath) && fs.existsSync(currentPublicPath),
    'A current Node 24 fingerprint is missing.'
  )

  const baselineShowcase = readFingerprint(baselineShowcasePath)
  const baselinePublic = readFingerprint(baselinePublicPath)
  const currentShowcase = readFingerprint(currentShowcasePath)
  const currentPublic = readFingerprint(currentPublicPath)
  assert(
    baselineShowcase.contract === 'bp-documentation-showcase-fingerprint' &&
      currentShowcase.contract === baselineShowcase.contract &&
      baselinePublic.contract ===
        'bp-documentation-public-artifact-fingerprint' &&
      currentPublic.contract === baselinePublic.contract,
    'A fingerprint contract drifted.'
  )
  assert(
    baselineShowcase.node === '22.23.0' &&
      baselinePublic.node === baselineShowcase.node,
    'Baselines were not produced together by Node 22.23.0.'
  )
  assert(
    currentShowcase.node === '24.12.0' &&
      currentPublic.node === currentShowcase.node,
    'Current results were not produced together by Node 24.12.0.'
  )
  assert(
    baselineShowcase.buildCommit === baselinePublic.buildCommit &&
      currentShowcase.buildCommit === currentPublic.buildCommit &&
      baselineShowcase.buildCommit === currentShowcase.buildCommit,
    'Node variants or artifact families used different BP commits.'
  )
  assert(
    JSON.stringify(baselineShowcase.output) ===
      JSON.stringify(currentShowcase.output),
    'Node 22.23.0 and Node 24.12.0 produced different showcase fingerprints.'
  )
  assert(
    JSON.stringify(baselinePublic.output) ===
      JSON.stringify(currentPublic.output),
    'Node 22.23.0 and Node 24.12.0 produced different public-artifact fingerprints.'
  )

  const evidence = {
    contract: 'bp-documentation-showcase-determinism-check',
    contractVersion: '0.1.0-draft',
    status: 'node-22-24-identical',
    buildCommit: currentShowcase.buildCommit,
    runtimes: [baselineShowcase.node, currentShowcase.node],
    output: {
      localCiShowcase: currentShowcase.output,
      publicDefaultPortal: currentPublic.output
    },
    compared: {
      fileCount: true,
      totalBytes: true,
      aggregateSha256: true,
      artifactFamilies: ['local-ci-showcase', 'public-default-portal'],
      sourceBodiesCopiedToEvidence: false
    }
  }
  fs.writeFileSync(
    path.join(topology.evidenceRoot, 'determinism.json'),
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  )
  process.stdout.write(
    `${JSON.stringify({ status: evidence.status, runtimes: evidence.runtimes, ...evidence.output })}\n`
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

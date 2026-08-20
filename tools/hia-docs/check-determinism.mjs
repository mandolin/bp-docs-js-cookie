/**
 * <lang><zh-CN>比较 Node 22 与 Node 24 生成的公开展示聚合指纹。</zh-CN><en>Compares aggregate public-showcase fingerprints produced by Node 22 and Node 24.</en></lang>
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
  const baselineArgument = process.argv[2]
  assert(baselineArgument, 'A staged Node 22 fingerprint path is required.')
  const baselinePath = path.resolve(repositoryRoot, baselineArgument)
  const currentPath = path.join(
    topology.evidenceRoot,
    'showcase-fingerprint.json'
  )
  assert(
    fs.existsSync(baselinePath),
    'The staged Node 22 fingerprint is missing.'
  )
  assert(
    fs.existsSync(currentPath),
    'The current Node 24 fingerprint is missing.'
  )

  const baseline = readFingerprint(baselinePath)
  const current = readFingerprint(currentPath)
  assert(
    baseline.contract === 'bp-documentation-showcase-fingerprint' &&
      current.contract === baseline.contract,
    'Fingerprint contract drifted.'
  )
  assert(
    baseline.node === '22.23.0',
    'Baseline was not produced by Node 22.23.0.'
  )
  assert(
    current.node === '24.12.0',
    'Current result was not produced by Node 24.12.0.'
  )
  assert(
    baseline.buildCommit === current.buildCommit,
    'Node variants used different BP commits.'
  )
  assert(
    JSON.stringify(baseline.output) === JSON.stringify(current.output),
    'Node 22.23.0 and Node 24.12.0 produced different showcase fingerprints.'
  )

  const evidence = {
    contract: 'bp-documentation-showcase-determinism-check',
    contractVersion: '0.1.0-draft',
    status: 'node-22-24-identical',
    buildCommit: current.buildCommit,
    runtimes: [baseline.node, current.node],
    output: current.output,
    compared: {
      fileCount: true,
      totalBytes: true,
      aggregateSha256: true,
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

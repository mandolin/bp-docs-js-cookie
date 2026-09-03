/**
 * <lang><zh-CN>验证默认 Portal 公共产物的单 profile 契约与隔离复制边界。</zh-CN><en>Validates the single-profile contract and isolated copy boundary of the default Portal public artifact.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-public-artifact-test
 * @lang zh-CN 测试只使用临时目录，不生成真实文档、不读取 owner 仓库或源码正文。
 * @lang en Tests use only temporary directories and do not generate real documentation or read owner repositories or source bodies.
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  PUBLICATION_BASELINE_ID,
  PUBLICATION_PROFILE_CONTRACT,
  createPublicArtifactManifest,
  materializePublicArtifact
} from './public-artifact.mjs'

/** @lang zh-CN 测试使用的完整公开 commit。 @lang en Full public commit used by tests. */
const BUILD_COMMIT = '1234567890abcdef1234567890abcdef12345678'
/** @lang zh-CN 当前测试模块目录用于读取将被原样发布的产品 runtime。 @lang en Current test-module directory is used to read the product runtime that is published verbatim. */
const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))

test('creates one default-Portal publication profile without a chooser', () => {
  // <lang><zh-CN>manifest 是 build、Pages checker 与 online checker 的共同公开事实源。</zh-CN><en>The manifest is the shared public fact source for the build, Pages checker, and online checker.</en></lang>
  const manifest = createPublicArtifactManifest({ buildCommit: BUILD_COMMIT })

  assert.equal(
    manifest.contract,
    PUBLICATION_PROFILE_CONTRACT
  )
  assert.equal(manifest.designBaseline.id, PUBLICATION_BASELINE_ID)
  assert.equal(manifest.buildCommit, BUILD_COMMIT)
  assert.equal(manifest.publicProfileCount, 1)
  assert.equal(manifest.localCiCoverageProfileCount, 27)
  assert.equal(manifest.defaultProfile.id, 'unified-portal.fetch.classic')
  assert.equal(manifest.defaultProfile.sourceMode, 'fetch')
  assert.equal(manifest.defaultProfile.pageMode, 'multi-page')
  assert.equal(manifest.rootIsProfileChooser, false)
  assert.equal(manifest.reviewOnlyElementsIncluded, false)
})

test('copies only the default Portal tree into an isolated public root', (t) => {
  // <lang><zh-CN>临时根模拟 showcase 中的默认 surface 与同级未发布 profile。</zh-CN><en>The temporary root models the default showcase surface and a sibling unpublished profile.</en></lang>
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bp-js-cookie-public-artifact-')
  )
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }))
  const defaultRoot = path.join(temporaryRoot, 'showcase', 'default')
  const unusedRoot = path.join(temporaryRoot, 'showcase', 'unused')
  const publicRoot = path.join(temporaryRoot, 'public')
  fs.mkdirSync(path.join(defaultRoot, 'assets'), { recursive: true })
  fs.mkdirSync(path.join(defaultRoot, 'pages'), { recursive: true })
  fs.mkdirSync(unusedRoot, { recursive: true })
  fs.writeFileSync(
    path.join(defaultRoot, 'index.html'),
    '<!doctype html><html data-hia-scheme="system"><head><link rel="stylesheet" href="assets/hia-default.css"></head><body><div class="hia-shell hia-project-split-site"><aside class="hia-sidebar"><input data-hia-project-search></aside><main class="hia-main" data-hia-project-content><p class="hia-project-empty">Empty</p><noscript><p>No script</p></noscript></main></div><script src="assets/hia-default.js"></script></body></html>'
  )
  fs.writeFileSync(path.join(defaultRoot, 'assets', 'site.css'), ':root{}')
  fs.writeFileSync(path.join(defaultRoot, 'pages', 'api-init-set-a1.html'), 'set')
  fs.writeFileSync(path.join(defaultRoot, 'pages', 'api-init-get-a1.html'), 'get')
  fs.writeFileSync(path.join(unusedRoot, 'chooser.html'), 'not public')

  const result = materializePublicArtifact({
    buildCommit: BUILD_COMMIT,
    defaultRoot,
    publicRoot
  })

  const publicHtml = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8')
  assert.match(publicHtml, /data-hia-public-product/u)
  assert.match(publicHtml, /data-hia-settings-dialog/u)
  assert.match(publicHtml, /代码区域 \/ 编辑器设置/u)
  assert.match(publicHtml, /data-hia-public-outline/u)
  assert.match(publicHtml, /data-hia-public-footer/u)
  assert.equal(publicHtml.includes('candidate-status-strip'), false)
  assert.equal(fs.existsSync(path.join(publicRoot, 'assets', 'site.css')), true)
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'assets', 'hia-public-product.css')),
    true
  )
  assert.equal(
    fs.existsSync(path.join(publicRoot, 'assets', 'hia-public-product.js')),
    true
  )
  assert.equal(fs.existsSync(path.join(publicRoot, 'unused', 'chooser.html')), false)
  assert.equal(fs.existsSync(path.join(publicRoot, 'profiles')), false)
  assert.equal(fs.existsSync(path.join(publicRoot, 'showcase-matrix.json')), false)
  assert.deepEqual(
    JSON.parse(
      fs.readFileSync(
        path.join(publicRoot, 'documentation-publication-profile.json'),
        'utf8'
      )
    ),
    result.manifest
  )
  assert.equal(result.manifest.publicProfileCount, 1)
  assert.equal(result.copiedFileCount, 4)
})

test('rejects a symbolic link in the default Portal source tree', (t) => {
  // <lang><zh-CN>发布复制不得把本机或 owner tree 通过链接带入 Pages。</zh-CN><en>Publication copying must not carry host or owner trees into Pages through links.</en></lang>
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'bp-js-cookie-public-link-')
  )
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }))
  const defaultRoot = path.join(temporaryRoot, 'showcase', 'default')
  const publicRoot = path.join(temporaryRoot, 'public')
  fs.mkdirSync(defaultRoot, { recursive: true })
  fs.writeFileSync(path.join(defaultRoot, 'index.html'), '<main>Portal</main>')
  fs.symlinkSync(
    path.join(defaultRoot, 'index.html'),
    path.join(defaultRoot, 'linked.html'),
    'file'
  )

  assert.throws(
    () =>
      materializePublicArtifact({
        buildCommit: BUILD_COMMIT,
        defaultRoot,
        publicRoot
      }),
    /symbolic link/u
  )
})

test('keeps deep-link recovery bounded while tolerating remote shard latency', () => {
  // <lang><zh-CN>静态边界防止恢复窗口回退为仅适合本地延迟的短次数循环，也防止 BP 产品层接管 owner 网络职责。</zh-CN><en>This static boundary prevents the recovery window from regressing to a short local-latency loop and prevents the BP product layer from taking over owner network duties.</en></lang>
  const runtime = fs.readFileSync(
    path.join(MODULE_DIRECTORY, 'public-product.js'),
    'utf8'
  )
  assert.match(runtime, /const deadline = performance\.now\(\) \+ 10000/u)
  assert.match(runtime, /while \(performance\.now\(\) < deadline\)/u)
  assert.match(runtime, /activeEntryIdentity\(\) !== identity/u)
  assert.equal(/\bfetch\s*\(/u.test(runtime), false)
})

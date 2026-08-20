/**
 * <lang><zh-CN>验证 bp-docs-js-cookie 展示矩阵的闭集、默认值、路由和 owner-neutral 皮肤映射。</zh-CN><en>Validates the closed showcase matrix, defaults, routes, and owner-neutral skin mapping for bp-docs-js-cookie.</en></lang>
 *
 * @module bp-docs-js-cookie/hia-docs-showcase-test
 * @lang zh-CN 测试只调用纯配置函数，不生成站点、不读取源码正文、不访问网络或 owner 仓库。
 * @lang en The tests call only pure configuration functions and do not generate sites, read source bodies, access the network, or inspect owner repositories.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEFAULT_SHOWCASE_PROFILE_ID,
  OUTPUT_PIPELINES,
  SHOWCASE_SKINS,
  SOURCE_READING_MODES,
  createJsdocConfig,
  createPortalConfig,
  createShowcaseProfiles,
  mapPortalSkin
} from './config.mjs'
import { createShowcaseManifest, renderShowcaseHub } from './hub.mjs'

test('creates the closed 27-profile showcase matrix', () => {
  // <lang><zh-CN>profiles 是后续 build/hub/checker 共用的唯一矩阵来源，测试拒绝缺项、重复项与额外模式。</zh-CN><en>Profiles are the sole matrix source shared by build, hub, and checker; this test rejects omissions, duplicates, and extra modes.</en></lang>
  const profiles = createShowcaseProfiles()
  // <lang><zh-CN>profileIds 用于证明三维笛卡尔积没有因 route 或 surface 展开而重复。</zh-CN><en>ProfileIds prove the three-dimensional Cartesian product is not duplicated by route or surface expansion.</en></lang>
  const profileIds = new Set(profiles.map(({ id }) => id))

  assert.deepEqual(OUTPUT_PIPELINES, [
    'jphs-jth-native',
    'hia-jsdoc',
    'unified-portal'
  ])
  assert.deepEqual(SOURCE_READING_MODES, ['fetch', 'embed', 'link'])
  assert.deepEqual(SHOWCASE_SKINS, ['classic', 'graphite', 'lumen'])
  assert.equal(profiles.length, 27)
  assert.equal(profileIds.size, 27)
  assert.equal(
    profiles
      .filter(({ isDefault }) => isDefault)
      .map(({ id }) => id)
      .join(),
    DEFAULT_SHOWCASE_PROFILE_ID
  )
  assert.equal(
    profiles
      .filter(({ pipeline }) => pipeline === 'hia-jsdoc')
      .every(
        ({ surfaces }) =>
          surfaces.map(({ kind }) => kind).join() === 'standalone,portal-bridge'
      ),
    true
  )
})

test('keeps profile routes safe and maps only neutral skin identities', () => {
  // <lang><zh-CN>profiles 同时覆盖 route、JTH skin 和 Portal skin；不允许从 owner 私有 CSS selector 推导映射。</zh-CN><en>Profiles cover routes, JTH skins, and Portal skins together; mappings must not be inferred from owner-private CSS selectors.</en></lang>
  const profiles = createShowcaseProfiles()

  for (const profile of profiles) {
    assert.match(profile.id, /^[a-z0-9][a-z0-9._-]*$/u)
    assert.match(profile.route, /^[a-z0-9][a-z0-9./_-]*\/$/u)
    assert.equal(profile.route.includes('..'), false)
    assert.equal(profile.portalSkin, mapPortalSkin(profile.skin))
    assert.equal(profile.pageMode, 'multi-page')
  }

  assert.equal(mapPortalSkin('classic'), 'portal.classic')
  assert.equal(mapPortalSkin('graphite'), 'portal.graphite')
  assert.equal(mapPortalSkin('lumen'), 'portal.lumen')
  assert.throws(() => mapPortalSkin('unknown'), /Unsupported showcase skin/u)
})

test('creates split-site Portal configurations without silent source fallback', () => {
  // <lang><zh-CN>每个 source mode 都必须显式进入 Portal config；默认 fetch 与具体 variant 不在函数内互相覆盖。</zh-CN><en>Every source mode must enter the Portal config explicitly; the fetch default and a concrete variant must not overwrite one another inside the function.</en></lang>
  for (const sourceMode of SOURCE_READING_MODES) {
    const config = createPortalConfig({
      sourceMode,
      skin: mapPortalSkin('graphite'),
      scheme: 'system'
    })

    assert.equal(config.docs.renderer.projectLayout, 'split-site')
    assert.equal(config.docs.source.presentation, sourceMode)
    assert.equal(config.docs.source.publicAssetPolicy, 'explicit-public')
    assert.equal(config.docs.theme.skin, 'portal.graphite')
    assert.equal(config.docs.theme.scheme, 'system')
    assert.equal('fetchBaseUrl' in config.docs.source, false)
    assert.equal('linkBaseUrl' in config.docs.source, false)
  }
})

test('keeps none as a separate fail-closed privacy regression', () => {
  // <lang><zh-CN>none 不进入公开 27-profile，但两个配置入口都必须能显式关闭源码正文、asset 与 preview。</zh-CN><en>None is excluded from the public 27 profiles, but both configuration entries must explicitly disable source bodies, assets, and previews.</en></lang>
  const portalConfig = createPortalConfig({ sourceMode: 'none' })
  const jsdocConfig = createJsdocConfig(
    {
      repositoryRoot: 'C:\\safe-repository',
      pluginRoot: 'C:\\safe-plugin',
      themeRoot: 'C:\\safe-theme',
      cacheRoot: 'C:\\safe-cache',
      jsdocNativeRoot: 'C:\\safe-output'
    },
    '1234567890abcdef1234567890abcdef12345678',
    { sourceMode: 'none' }
  )

  assert.equal(
    createShowcaseProfiles().some(({ sourceMode }) => sourceMode === 'none'),
    false
  )
  assert.equal(portalConfig.docs.source.enabled, false)
  assert.equal(portalConfig.docs.source.mode, 'none')
  assert.equal(portalConfig.docs.source.presentation, 'none')
  assert.equal(portalConfig.docs.source.publicAssetPolicy, 'none')
  assert.equal(jsdocConfig.opts.hia.source.mode, 'metadata')
  assert.equal(jsdocConfig.opts.hia.source.preview.enabled, false)
  assert.equal(jsdocConfig.opts.hia.presentation.sourceMode, 'none')
})

test('renders a no-script-capable public hub without root-absolute routes', () => {
  // <lang><zh-CN>hub manifest 只保存 profile、公开 owner commit 与 BP build commit；不携带本机路径或运行时。</zh-CN><en>The hub manifest stores only profiles, public owner commits, and the BP build commit; it carries no host path or runtime identity.</en></lang>
  const manifest = createShowcaseManifest({
    buildCommit: '1234567890abcdef1234567890abcdef12345678',
    profiles: createShowcaseProfiles()
  })
  // <lang><zh-CN>HTML 是关闭 JavaScript 时仍可访问全部 surface 的静态索引。</zh-CN><en>The HTML is a static index that keeps every surface reachable with JavaScript disabled.</en></lang>
  const html = renderShowcaseHub(manifest)

  assert.equal(manifest.profileCount, 27)
  assert.equal(manifest.surfaceCount, 36)
  assert.equal(manifest.defaultProfileId, DEFAULT_SHOWCASE_PROFILE_ID)
  assert.equal((html.match(/data-showcase-profile=/gu) || []).length, 27)
  assert.equal((html.match(/data-showcase-surface=/gu) || []).length, 36)
  assert.match(html, /<noscript>/u)
  assert.match(html, /href="profiles\/unified-portal\/fetch\/classic\/"/u)
  assert.equal(/(?:href|src)="\//u.test(html), false)
  assert.equal(html.includes('K:\\'), false)
})

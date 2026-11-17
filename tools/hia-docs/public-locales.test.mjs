/** @module bp-docs-js-cookie/public-locales-test
 * @lang zh-CN 先验证同一Portal的显式双语静态入口、共享资产、脚本保真及拒绝边界。
 * @lang en Verify explicit bilingual static entries for the same Portal, shared assets, script fidelity, and rejection boundaries.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  renderLocaleLanding,
  materializeLocaleLandings
} from './public-locales.mjs'

/** @lang zh-CN 固定生成器结构夹具包含非JSON外层的纯JSON UI数据和不得翻译的脚本正文。 @lang en Fixed generator fixture contains JSON UI data inside a non-JSON configuration and script text that must remain unchanged. */
const fixture = `<!doctype html><html lang="zh-CN"><head><title>Portal</title><link href="assets/default.css" rel="stylesheet"></head><body><a href="./" data-hia-public-i18n-aria="home" aria-label="首页">js-cookie</a><h1 data-hia-public-i18n="landingTitle">轻量、明确地管理 Cookie。</h1><span data-hia-ui-message="portal.locale.uilabel">界面语言</span><select data-hia-ui-locale-control><option value="zh-CN" selected>简体中文</option><option value="en">English</option></select><a href="pages/index.html">API</a><button data-hia-public-locale data-hia-public-i18n-aria="switchToEnglish" aria-label="切换到英语界面">EN</button><script>const config = { ui: {"bundles":{"zh-CN":{"portal.locale.uilabel":"界面语言"},"en":{"portal.locale.uilabel":"UI language"}},"initialLocale":"zh-CN","supportedLocales":["zh-CN","en"]} }; const untouched = '<h1 data-hia-public-i18n="landingTitle">script</h1>';</script></body></html>`

test('renders static bilingual identities and keeps scripts and assets intact', () => {
  for (const locale of ['zh-CN', 'en']) {
    const result = renderLocaleLanding(fixture, locale)
    assert.ok(result.includes(`lang="${locale}"`))
    assert.ok(result.includes(`data-hia-public-route-locale="${locale}"`))
    assert.ok(result.includes(`href="index.${locale}.html"`))
    assert.ok(result.includes(`href="pages/${locale}/index.html"`))
    assert.ok(result.includes('href="assets/default.css"'))
    assert.ok(
      result.includes(
        `const untouched = '<h1 data-hia-public-i18n="landingTitle">script</h1>';`
      )
    )
    assert.ok(result.includes(`<option value="${locale}" selected>`))
    assert.ok(
      result.indexOf('data-hia-public-route-init') < result.indexOf('</head>')
    )
  }
  const english = renderLocaleLanding(fixture, 'en')
  assert.match(english, />Manage Cookies with clarity and care\.<\/h1>/u)
  assert.match(english, />UI language<\/span>/u)
  assert.match(english, /aria-label="Switch interface to Chinese"/u)
})

test('rejects unsupported locales, missing catalogs, and non-leaf translation slots', () => {
  assert.throws(() => renderLocaleLanding(fixture, 'fr'), /locale/u)
  assert.throws(
    () => renderLocaleLanding(fixture.replace(' ui: ', ' changed: '), 'en'),
    /UI bundle/u
  )
  assert.throws(
    () =>
      renderLocaleLanding(
        fixture.replace('轻量、明确地管理 Cookie。', '<b>nested</b>'),
        'en'
      ),
    /translation slot/u
  )
  assert.throws(
    () =>
      renderLocaleLanding(
        fixture.replace('landingTitle"', 'unknownMessage"'),
        'en'
      ),
    /message/u
  )
})

test('materializes both locale aliases without overwriting the neutral root', (t) => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-locale-'))
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }))
  const publicRoot = path.join(temporary, 'public')
  fs.mkdirSync(publicRoot)
  fs.writeFileSync(path.join(publicRoot, 'index.html'), fixture)
  materializeLocaleLandings(publicRoot)
  assert.equal(
    fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8'),
    fixture
  )
  assert.ok(fs.existsSync(path.join(publicRoot, 'index.en.html')))
  assert.ok(fs.existsSync(path.join(publicRoot, 'index.zh-CN.html')))
  assert.throws(() => materializeLocaleLandings(publicRoot), /already exists/u)
})

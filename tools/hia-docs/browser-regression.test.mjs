/**
 * @file
 * @lang zh-CN 对真实默认Portal运行六项浏览器回归，覆盖来源保真、静态路由和键盘焦点。
 * @lang en Runs six browser regressions against the actual default Portal, covering source fidelity, static routes, and keyboard focus.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

/** @lang zh-CN 文档专用锁确定浏览器测试依赖。 @lang en The documentation-only lock determines browser-test dependencies. */
const runtimeRequire = createRequire(
  new URL('./runtime/package.json', import.meta.url)
)
/** @lang zh-CN 仅启动固定开发依赖提供的Chromium。 @lang en Launch only Chromium supplied by the pinned development dependency. */
const { chromium } = runtimeRequire('playwright')
/** @lang zh-CN 当前测试模块的本地目录。 @lang en Local directory of this test module. */
const directory = path.dirname(fileURLToPath(import.meta.url))
/** @lang zh-CN 已生成的公开站点目录，测试只读取其内容。 @lang en Generated public-site directory, read only by these tests. */
const publicRoot = path.resolve(directory, '../../build/hia-docs/public')
/** @lang zh-CN 独立loopback端口，可供并行CI显式指定。 @lang en Dedicated loopback port, explicitly configurable for concurrent CI. */
const port = Number(process.env.HIA_BP_TEST_PORT || 4187)
/** @lang zh-CN 与正式Pages一致的项目基址。 @lang en Project base matching production Pages. */
const base = `http://127.0.0.1:${port}/bp-docs-js-cookie/`
/** @lang zh-CN 来自真实项目索引的公开set条目身份。 @lang en Public set-entry identity from the actual project index. */
const setIdentity =
  'jsdoc-integration:jsdoc-function-module-js-cookie-api-init-set'
/** @lang zh-CN 正常交互条目入口。 @lang en Normal interactive entry URL. */
const setUrl = base + '#entry=' + encodeURIComponent(setIdentity)
/** @lang zh-CN 本测试拥有的浏览器生命周期。 @lang en Browser lifecycle owned by this test. */
let browser
/** @lang zh-CN 本测试拥有的只读静态服务器进程。 @lang en Read-only static-server process owned by this test. */
let server

before(async () => {
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535)
  // <lang><zh-CN>先启动现有受限服务器，Windows后台子进程保持隐藏。</zh-CN><en>Start the existing constrained server, keeping Windows background child windows hidden.</en></lang>
  server = spawn(
    process.execPath,
    [path.join(directory, 'serve.mjs'), String(port)],
    {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }
  )
  await Promise.race([
    once(server.stdout, 'data', { signal: AbortSignal.timeout(15000) }),
    once(server, 'exit').then(() => {
      throw new Error('Portal test server exited before listening.')
    })
  ])
  browser = await chromium.launch({
    headless: true,
    ...(process.env.HIA_BP_BROWSER_CHANNEL
      ? { channel: process.env.HIA_BP_BROWSER_CHANNEL }
      : process.platform === 'win32'
        ? { channel: 'chrome' }
        : {})
  })
})

after(async () => {
  await browser?.close()
  if (server && server.exitCode === null) {
    // <lang><zh-CN>关闭本测试自有服务器并等待退出，避免端口泄漏。</zh-CN><en>Stop this test's own server and await exit to avoid leaking its port.</en></lang>
    const exited = once(server, 'exit')
    server.kill()
    await exited
  }
})

/**
 * @lang zh-CN 在隔离上下文执行公开阅读路径并核未处理脚本错误。
 * @lang en Run a public reading path in an isolated context and check unhandled script errors.
 * @param {number} width <lang><zh-CN>视口宽度，单位像素。</zh-CN><en>Viewport width in pixels.</en></lang>
 * @param {(page: import('playwright').Page) => Promise<void>} action <lang><zh-CN>要验证的真实操作。</zh-CN><en>Actual actions to verify.</en></lang>
 * @param {boolean} [noScript] <lang><zh-CN>真正禁用脚本。</zh-CN><en>Actually disable scripts.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>断言通过后释放上下文。</zh-CN><en>Release the context after assertions pass.</en></lang>
 */
async function scenario(width, action, noScript = false) {
  // <lang><zh-CN>每条路线有独立设备偏好和页面错误集合。</zh-CN><en>Each route owns isolated device preferences and page-error records.</en></lang>
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    javaScriptEnabled: !noScript
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  try {
    await action(page)
    assert.deepEqual(errors, [])
  } finally {
    await context.close()
  }
}

/**
 * @lang zh-CN 用真实Tab抵达当前可见目标，保留浏览器自然焦点顺序。
 * @lang en Reach a currently visible target by real Tab keys, retaining native focus order.
 * @param {import('playwright').Page} page <lang><zh-CN>隔离页面。</zh-CN><en>Isolated page.</en></lang>
 * @param {string} selector <lang><zh-CN>已知产品控件选择器。</zh-CN><en>Known product-control selector.</en></lang>
 * @param {string} [label] <lang><zh-CN>可选精确公开标签。</zh-CN><en>Optional exact public label.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>不可到达时拒绝。</zh-CN><en>Reject if unreachable.</en></lang>
 */
async function seek(page, selector, label) {
  for (let step = 0; step < 160; step += 1) {
    if (
      await page.evaluate(
        ({ selector, label }) =>
          document.activeElement.matches(selector) &&
          (!label || document.activeElement.textContent.trim() === label),
        { selector, label }
      )
    )
      return
    await page.keyboard.press('Tab')
  }
  throw new Error(`Keyboard target unreachable: ${selector}`)
}

/**
 * @lang zh-CN 等待真实文档和导航到达。
 * @lang en Wait for actual documentation and navigation to arrive.
 * @param {import('playwright').Page} page <lang><zh-CN>隔离页面。</zh-CN><en>Isolated page.</en></lang>
 * @param {string} [url] <lang><zh-CN>默认指向真实set条目。</zh-CN><en>Defaults to the actual set entry.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>文档与索引到达后完成。</zh-CN><en>Resolves after documentation and index arrive.</en></lang>
 */
async function enter(page, url = setUrl) {
  await page.goto(url)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.hia-sidebar button')].some(
      (button) => button.textContent === 'set'
    )
  )
  if (url === setUrl) await page.locator('#hia-api-set-signature').waitFor()
}

/**
 * @lang zh-CN 按原生disclosure路径展开真实源码并等待验证就绪。
 * @lang en Expand actual source through native disclosures and await verified readiness.
 * @param {import('playwright').Page} page <lang><zh-CN>已打开set的隔离页面。</zh-CN><en>Isolated page with the set entry open.</en></lang>
 * @returns {Promise<import('playwright').Locator>} <lang><zh-CN>验证就绪的源码阅读区。</zh-CN><en>Source reader after verified readiness.</en></lang>
 */
async function source(page) {
  await seek(page, 'article details[data-hia-topic-section="source"] > summary')
  await page.keyboard.press('Enter')
  await seek(page, 'article details[data-hia-source-fetch] > summary')
  await page.keyboard.press('Enter')
  await page
    .locator(
      'article:has(#hia-api-set-signature) details[data-hia-source-state="ready"]'
    )
    .waitFor()
  return page
    .locator('article')
    .filter({ has: page.locator('#hia-api-set-signature') })
    .locator('details[data-hia-source-fetch]')
    .first()
}

test('localized static source links resolve to emitted files and readable native line pages', async () => {
  // <lang><zh-CN>实际54个静态链接逐项解析，错误目录相对基址会直接失败。</zh-CN><en>Resolve all actual 54 static links individually, failing on incorrect directory-relative bases.</en></lang>
  const pages = fs
    .readdirSync(path.join(publicRoot, 'pages'), { recursive: true })
    .filter((name) => name.endsWith('.html'))
  let checked = 0
  for (const relative of pages) {
    const pathname = 'pages/' + relative.replaceAll('\\', '/')
    const html = fs.readFileSync(path.join(publicRoot, pathname), 'utf8')
    for (const match of html.matchAll(
      /href="([^"]*sources\/[^"#]+\.html#L\d+)"/gu
    )) {
      const target = new URL(match[1], base + pathname)
      assert.equal(target.origin, new URL(base).origin)
      assert.ok(
        fs.existsSync(
          path.join(
            publicRoot,
            target.pathname.slice(new URL(base).pathname.length)
          )
        ),
        pathname
      )
      checked += 1
    }
  }
  assert.equal(checked, 54)
  for (const locale of ['zh-CN', 'en'])
    await scenario(
      320,
      async (page) => {
        await page.goto(base + `pages/${locale}/index.html`)
        await page.getByRole('link', { name: 'set', exact: true }).click()
        await page.locator('#hia-api-set-signature').waitFor()
        await seek(page, 'details[data-hia-topic-section="source"] > summary')
        await page.keyboard.press('Enter')
        const link = page
          .locator('main a[href*="sources/"][href*=".html#L"]')
          .first()
        await seek(
          page,
          'a[href=' + JSON.stringify(await link.getAttribute('href')) + ']'
        )
        const navigation = page.waitForNavigation({ waitUntil: 'load' })
        await page.keyboard.press('Enter')
        assert.equal((await navigation).status(), 200)
        assert.equal(await page.locator('#L66').count(), 1)
      },
      true
    )
})

test('verified highlighting preserves source text, every native row and original line identities', async () => {
  for (const width of [1440, 320])
    await scenario(width, async (page) => {
      await enter(page)
      const reader = await source(page)
      const asset = await reader.getAttribute('data-hia-source-fetch')
      const text = fs.readFileSync(path.join(publicRoot, asset), 'utf8')
      await reader.locator('.token').first().waitFor()
      const measured = await reader.evaluate((element) => {
        // <lang><zh-CN>只拼接正文列，行号链接与语法token均保留独立节点。</zh-CN><en>Join content columns only, keeping line links and syntax tokens as independent nodes.</en></lang>
        const rows = [...element.querySelectorAll('.hia-source-code-line')]
        return {
          text: rows
            .map(
              (row) =>
                row.querySelector('.hia-public-source-line-content')
                  ?.textContent
            )
            .join('\n'),
          numbers: rows.map((row) => Number(row.dataset.hiaSourceLineNumber)),
          labels: rows.map(
            (row) => row.querySelector('.hia-source-line-number')?.textContent
          ),
          extraNumbers: element.querySelectorAll('.line-numbers-rows').length
        }
      })
      assert.equal(measured.text, text)
      assert.equal(measured.numbers.length, text.split(/\r?\n/u).length)
      assert.deepEqual(
        measured.numbers,
        Array.from({ length: 47 }, (_, index) => index + 66)
      )
      assert.deepEqual(measured.labels, measured.numbers.map(String))
      assert.equal(measured.extraNumbers, 0)
    })
  // <lang><zh-CN>显式公开合成片段补充跨行token与空行，校验元数据仅在此隔离context替换。</zh-CN><en>An explicitly synthetic public excerpt covers multiline tokens and blank lines, replacing integrity metadata only in this isolated context.</en></lang>
  await scenario(320, async (page) => {
    await enter(page)
    const synthetic =
      '/* first\nsecond */\nconst value = `first\nsecond`;\n\nglobalThis.__hiaSyntheticExecuted = true;'
    const bytes = Buffer.from(synthetic)
    const integrity =
      'sha384-' + createHash('sha384').update(bytes).digest('base64')
    const reader = page
      .locator('article')
      .filter({ has: page.locator('#hia-api-set-signature') })
      .locator('details[data-hia-source-fetch]')
      .first()
    const asset = new URL(
      await reader.getAttribute('data-hia-source-fetch'),
      base
    ).href
    await page.route(asset, (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: bytes })
    )
    await reader.evaluate(
      (element, metadata) => {
        element.dataset.hiaSourceByteLength = String(metadata.bytes)
        element.dataset.hiaSourceIntegrity = metadata.integrity
      },
      { bytes: bytes.length, integrity }
    )
    await source(page)
    await reader
      .locator('.hia-public-source-line-content .token')
      .first()
      .waitFor()
    const projection = await reader.evaluate((element) => ({
      text: [...element.querySelectorAll('.hia-public-source-line-content')]
        .map((column) => column.textContent)
        .join('\n'),
      secondLineComment: element
        .querySelectorAll('.hia-public-source-line-content')[1]
        .querySelector('.token.comment')?.textContent,
      fourthLineTemplate: Boolean(
        element
          .querySelectorAll('.hia-public-source-line-content')[3]
          .querySelector('.token.template-string')
      ),
      executed: Boolean(globalThis.__hiaSyntheticExecuted)
    }))
    assert.equal(projection.text, synthetic)
    assert.equal(projection.secondLineComment, 'second */')
    assert.equal(projection.fourthLineTemplate, true)
    assert.equal(projection.executed, false)
  })
})

test('mobile directory selection transfers focus to visible content after the projection closes', async () => {
  await scenario(320, async (page) => {
    await enter(page, base)
    await seek(page, '.hia-public-mobile-navigation > summary')
    await page.keyboard.press('Enter')
    await seek(page, '.hia-public-mobile-navigation button', 'get')
    await page.keyboard.press('Enter')
    await page.locator('#hia-api-get-signature').waitFor()
    assert.equal(
      await page.evaluate(
        () =>
          document.activeElement !== document.body &&
          Boolean(document.activeElement.closest('main'))
      ),
      true
    )
    assert.equal(
      await page.locator('.hia-public-mobile-navigation').getAttribute('open'),
      null
    )
  })
  // <lang><zh-CN>读者在响应到达前移到设置入口，迟到内容须保留其焦点选择。</zh-CN><en>If the reader moves to settings before a response arrives, late content must preserve that focus choice.</en></lang>
  await scenario(320, async (page) => {
    await enter(page, base)
    /** @lang zh-CN 延迟目标取自实际索引的presentationPath，等待沿浏览器默认超时限界。 @lang en The delayed target comes from the actual index presentationPath, with waiting bounded by the browser timeout. */
    const index = JSON.parse(fs.readFileSync(path.join(publicRoot, 'project-index.json'), 'utf8'))
    const entry = index.entries.find(item => item.name === 'get')
    const target = new URL(entry.presentationPath || entry.contentPath, base).href
    let release
    const gate = new Promise(resolve => { release = resolve })
    await page.route(target, async route => {
      await gate
      await route.continue()
    })
    const arrival = page.waitForRequest(request => request.url() === target)
    try {
      await seek(page, '.hia-public-mobile-navigation > summary')
      await page.keyboard.press('Enter')
      await seek(page, '.hia-public-mobile-navigation button', 'get')
      await page.keyboard.press('Enter')
      await arrival
      await seek(page, '[data-hia-settings-open]')
      release()
      await page.locator('#hia-api-get-signature').waitFor()
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.matches('[data-hia-settings-open]')
        ),
        true
      )
    } finally {
      release()
    }
  })
})

test('source reset restores a visible control after hiding the initiating reset button', async () => {
  await scenario(320, async (page) => {
    await enter(page)
    await source(page)
    await seek(page, 'article [data-hia-source-reset]')
    await page.keyboard.press('Enter')
    assert.equal(
      await page.evaluate(() =>
        document.activeElement.matches(
          'details[data-hia-source-fetch] > summary'
        )
      ),
      true
    )
    assert.equal(
      await page
        .locator(
          'article:has(#hia-api-set-signature) details[data-hia-source-fetch]'
        )
        .getAttribute('data-hia-source-state'),
      'idle'
    )
  })
})

test('outline focuses the selected section and retains native subsequent keyboard navigation', async () => {
  for (const width of [1440, 320])
    await scenario(width, async (page) => {
      await enter(page)
      const outline =
        width === 1440 ? '.hia-public-outline' : '.hia-public-mobile-outline'
      if (width === 320) {
        await seek(page, outline + ' > summary')
        await page.keyboard.press('Enter')
      }
      await seek(page, outline + ' a[href="#hia-api-set-parameters"]')
      await page.keyboard.press('Enter')
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        'hia-api-set-parameters'
      )
      await page.keyboard.press('Tab')
      // <lang><zh-CN>完整可见的宽屏表格没有额外Tab控件，窄屏原生滚动区则必须可达。</zh-CN><en>A fully visible wide table adds no Tab control, while the narrow native scroll region must remain reachable.</en></lang>
      const next = await page.evaluate(() => {
        const table = document.querySelector(
          'article:has(#hia-api-set-signature) .hia-public-api-table-scroll'
        )
        return {
          overflow: table.scrollWidth > table.clientWidth,
          tableFocused: document.activeElement === table,
          nextDisclosure: document.activeElement.matches(
            'article details[data-hia-topic-section="provenance"] > summary'
          )
        }
      })
      assert.equal(
        next.overflow ? next.tableFocused : next.nextDisclosure,
        true,
        JSON.stringify(next)
      )
    })
})

test('native breadcrumb focus remains visible below the fixed header', async () => {
  for (const width of [1440, 1024])
    await scenario(width, async (page) => {
      await enter(page)
      await seek(page, '.hia-public-breadcrumb a')
      await page.waitForTimeout(180)
      const bounds = await page.evaluate(() => ({
        top: document.activeElement.getBoundingClientRect().top,
        header: document
          .querySelector('.hia-public-header')
          .getBoundingClientRect().bottom
      }))
      assert.ok(bounds.top >= bounds.header, JSON.stringify(bounds))
    })
})

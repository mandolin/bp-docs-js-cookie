/**
 * @file
 * @lang zh-CN 对真实默认Portal及第一方偏好指南运行浏览器回归，覆盖来源保真、静态路由、键盘焦点和打印。
 * @lang en Runs browser regressions against the actual default Portal and first-party preference guide, covering source fidelity, static routes, keyboard focus, and print.
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

test('confirmed API heading, open surface, tree density and mobile outline retain real contracts', async () => {
  for (const width of [1440, 1024, 390, 320]) {
    await scenario(width, async (page) => {
      await page.goto(setUrl)
      await page.locator('#hia-api-set-signature').waitFor()
      assert.equal(
        await page
          .locator('[data-hia-public-api-topic]:visible h1')
          .textContent(),
        'Cookies.set()'
      )
      assert.equal(
        await page
          .locator('[data-hia-public-api-topic]:visible .hia-i18n-fields')
          .count(),
        0
      )
      // <lang><zh-CN>同一真实article同时检查开放表面和DOM阅读顺序，隐藏兄弟条目不能成为度量来源。</zh-CN><en>Check the open surface and DOM reading order on the same real article, excluding hidden sibling entries from measurement.</en></lang>
      const shape = await page
        .locator('[data-hia-public-api-topic]:visible')
        .evaluate((article) => {
          const style = getComputedStyle(article)
          const header = article.querySelector('.hia-public-api-heading')
          const outline = article.querySelector('.hia-public-mobile-outline')
          return {
            border: style.borderTopWidth,
            padding: style.padding,
            background: style.backgroundColor,
            outlineAfterHeading: header.nextElementSibling === outline,
            headingSize: getComputedStyle(header.querySelector('h1')).fontSize
          }
        })
      assert.equal(shape.border, '0px')
      assert.equal(shape.padding, '0px')
      assert.equal(shape.background, 'rgba(0, 0, 0, 0)')
      assert.equal(shape.outlineAfterHeading, true)
      // <lang><zh-CN>固定画布的正文边界防止平板规则覆盖手机16px留白。</zh-CN><en>Content origins on fixed canvases prevent tablet rules from overriding the 16px mobile gutter.</en></lang>
      const articleBounds = await page
        .locator('[data-hia-public-api-topic]:visible')
        .boundingBox()
      const expectedOrigin = { 1440: 408, 1024: 272, 390: 16, 320: 16 }[width]
      assert.equal(Math.round(articleBounds.x), expectedOrigin)
      assert.equal(
        await page
          .locator('#hia-api-set-signature')
          .evaluate((heading) => heading.tagName),
        'H2'
      )
      assert.equal(
        await page
          .locator('.hia-public-outline-list a')
          .first()
          .getAttribute('href'),
        '#hia-api-set-signature'
      )
      assert.ok(Number.parseFloat(shape.headingSize) >= 32)
      if (width > 760) {
        assert.equal(await page.locator('.hia-public-tree-heading').count(), 1)
        assert.equal(
          await page
            .locator('.hia-public-tree-count')
            .first()
            .evaluate((node) => getComputedStyle(node).backgroundColor),
          'rgba(0, 0, 0, 0)'
        )
      }
      assert.ok(
        (
          await page.locator('.hia-public-api-lead:visible').innerText()
        ).includes('浏览器')
      )
      await page.locator('[data-hia-public-locale]').click()
      assert.equal(
        await page
          .locator('.hia-public-tree-heading > span')
          .first()
          .textContent(),
        'Documentation'
      )
      assert.equal(
        await page.locator('.hia-public-api-heading h1:visible').textContent(),
        'Cookies.set()'
      )
      assert.equal(
        await page
          .locator('[data-hia-public-copy]:visible')
          .first()
          .textContent(),
        'Copy'
      )
    })
  }
})

test('confirmed settings cards preserve wrapping, line defaults, scope and stored values', async () => {
  for (const width of [1440, 390, 320]) {
    await scenario(width, async (page) => {
      await page.goto(base)
      await page.locator('html:not(.no-js)').waitFor()
      await page.locator('[data-hia-settings-open]').click()
      assert.deepEqual(
        await page
          .locator('.hia-public-settings-body legend')
          .allTextContents(),
        [
          '站点主题',
          'API 显示范围',
          '内容显示',
          '代码区域 / 编辑器设置',
          '阅读设置'
        ]
      )
      assert.equal(await page.locator('.hia-public-theme-swatch').count(), 3)
      assert.equal(
        await page
          .locator('input[type="checkbox"][data-hia-preference="codeLines"]')
          .isChecked(),
        true
      )
      await page.locator('[data-hia-preference="codeWrap"]').check()
      assert.equal(
        await page.locator('html').getAttribute('data-hia-code-wrap'),
        'wrap'
      )
      await page.locator('[data-hia-preference="codeLines"]').uncheck()
      assert.equal(
        await page.locator('html').getAttribute('data-hia-code-lines'),
        'hide'
      )
      await page
        .locator('[data-hia-preference="apiScope"][value="all"]')
        .check()
      assert.equal(
        await page.locator('[data-hia-public-scope-label]').textContent(),
        '全部'
      )
      await page.locator('[data-hia-settings-close]').click()
      await page.reload()
      await page.locator('html:not(.no-js)').waitFor()
      assert.equal(
        await page.locator('html').getAttribute('data-hia-code-wrap'),
        'wrap'
      )
      assert.equal(
        await page.locator('html').getAttribute('data-hia-code-lines'),
        'hide'
      )
      await page.locator('[data-hia-settings-open]').click()
      await page.locator('[data-hia-settings-reset]').click()
      assert.equal(
        await page.locator('html').getAttribute('data-hia-code-wrap'),
        'scroll'
      )
      assert.equal(
        await page.locator('html').getAttribute('data-hia-code-lines'),
        'show'
      )
      assert.equal(
        await page.locator('html').getAttribute('data-hia-api-scope'),
        'public'
      )
    })
  }
})

test('copy controls preserve exact code, keyboard focus and bilingual permission failure feedback', async () => {
  await scenario(390, async (page) => {
    // <lang><zh-CN>仅替换本测试上下文的剪贴板写入，记录已知公开输入；不读取宿主剪贴板。</zh-CN><en>Replace clipboard writing only in this test context and record known public input, without reading the host clipboard.</en></lang>
    await page.addInitScript(() => {
      window.copiedPublicCode = []
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (text) => {
            window.copiedPublicCode.push(text)
          }
        }
      })
    })
    await page.goto(base)
    await page.locator('html:not(.no-js)').waitFor()
    // <lang><zh-CN>脚本合成点击不能写剪贴板，随后验证真正键盘激活。</zh-CN><en>A script-synthesized click cannot write the clipboard; verify real keyboard activation next.</en></lang>
    await page
      .locator('[data-hia-public-copy="hia-public-install-code"]')
      .evaluate((button) => button.click())
    assert.deepEqual(await page.evaluate(() => window.copiedPublicCode), [])
    await page
      .locator('[data-hia-public-copy="hia-public-install-code"]')
      .focus()
    await page.keyboard.press('Enter')
    assert.deepEqual(await page.evaluate(() => window.copiedPublicCode), [
      'npm install js-cookie'
    ])
    assert.equal(
      await page
        .locator('[data-hia-public-copy="hia-public-install-code"]')
        .textContent(),
      '已复制'
    )
    await page.locator('[data-hia-public-locale]').click()
    await page.goto(setUrl)
    // <lang><zh-CN>仅变更hash沿用原文档，必须实际刷新才验证已保存语言的冷启动。</zh-CN><en>A hash-only navigation retains the document, so reload to exercise initialization with the persisted language.</en></lang>
    await page.reload()
    await page.locator('#hia-api-set-signature').waitFor()
    // <lang><zh-CN>保存英文后冷载，异步到达的复制控件必须直接使用英文，且复制精确的签名与多行示例。</zh-CN><en>After persisting English and cold-loading, asynchronous copy controls must use English immediately and copy the exact signature and multiline example.</en></lang>
    assert.equal(
      await page
        .locator('[data-hia-public-copy="hia-api-set-signature-code"]')
        .textContent(),
      'Copy'
    )
    const expectedCode = []
    for (const id of [
      'hia-api-set-signature-code',
      'hia-api-set-example-code'
    ]) {
      expectedCode.push(await page.locator('#' + id).textContent())
      await page.locator(`[data-hia-public-copy="${id}"]`).focus()
      await page.keyboard.press('Enter')
    }
    assert.deepEqual(
      await page.evaluate(() => window.copiedPublicCode),
      expectedCode
    )
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {
        throw new DOMException('Denied', 'NotAllowedError')
      }
    })
    await page
      .locator('[data-hia-public-copy="hia-api-set-signature-code"]')
      .focus()
    await page.keyboard.press('Space')
    assert.equal(
      await page
        .locator('[data-hia-public-copy="hia-api-set-signature-code"]')
        .textContent(),
      'Copy failed'
    )
    assert.equal(await page.locator('textarea').count(), 0)
    assert.equal(
      await page.evaluate(() => document.activeElement.dataset.hiaPublicCopy),
      'hia-api-set-signature-code'
    )
    assert.ok(
      (
        await page.locator('#hia-api-set-signature-code').textContent()
      ).startsWith('Cookies.set(')
    )
  })
  await scenario(
    320,
    async (page) => {
      await page.goto(base)
      assert.equal(
        await page
          .locator('[data-hia-public-copy="hia-public-install-code"]')
          .isVisible(),
        false
      )
      assert.equal(
        await page.locator('#hia-public-install-code').textContent(),
        'npm install js-cookie'
      )
    },
    true
  )
})

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
    const index = JSON.parse(
      fs.readFileSync(path.join(publicRoot, 'project-index.json'), 'utf8')
    )
    const entry = index.entries.find((item) => item.name === 'get')
    const target = new URL(entry.presentationPath || entry.contentPath, base)
      .href
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    await page.route(target, async (route) => {
      await gate
      await route.continue()
    })
    const arrival = page.waitForRequest((request) => request.url() === target)
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
      // <lang><zh-CN>完整可见的表格后按正文顺序进入新增示例复制按钮；窄屏先到原生滚动区。</zh-CN><en>After a fully visible table, document order reaches the restored example copy button; a narrow viewport first reaches the native scroll region.</en></lang>
      const next = await page.evaluate(() => {
        const table = document.querySelector(
          'article:has(#hia-api-set-signature) .hia-public-api-table-scroll'
        )
        return {
          overflow: table.scrollWidth > table.clientWidth,
          tableFocused: document.activeElement === table,
          nextCopy: document.activeElement.matches(
            '[data-hia-public-copy="hia-api-set-example-code"]'
          )
        }
      })
      assert.equal(
        next.overflow ? next.tableFocused : next.nextCopy,
        true,
        JSON.stringify(next)
      )
      // <lang><zh-CN>锚点后的原生展开触发重建，必须保留当前条目和正文顺序。</zh-CN><en>A native disclosure after anchor navigation triggers rebuilding and must retain the current article and document order.</en></lang>
      await seek(
        page,
        'article details[data-hia-topic-section="provenance"] > summary'
      )
      await page.keyboard.press('Enter')
      assert.equal(
        await page.locator('.hia-public-api-heading h1:visible').textContent(),
        'Cookies.set()'
      )
      assert.equal(
        await page
          .locator('.hia-public-outline-list a')
          .first()
          .getAttribute('href'),
        '#hia-api-set-signature'
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

/**
 * @lang zh-CN 读取指南自然焦点的稳定节点身份和实际可见片段，不改变页面状态。
 * @lang en Read a guide's native focus identity and actually visible fragments without changing page state.
 * @param {import('playwright').Page} page <lang><zh-CN>指南页面。</zh-CN><en>Guide page.</en></lang>
 * @returns {Promise<Object>} <lang><zh-CN>节点身份、命中与焦点状态。</zh-CN><en>Node identity, hit testing and focus state.</en></lang>
 */
async function guideFocus(page) {
  return page.evaluate(() => {
    /** @lang zh-CN 原生活动节点，BODY表示浏览器顺序边界。 @lang en Native active node, with BODY marking a browser traversal boundary. */
    const element = document.activeElement
    /** @lang zh-CN DOM路径区分相同href的不同位置，不合并重复入口。 @lang en A DOM path distinguishes positions with the same href without merging duplicate entries. */
    const parts = []
    for (
      let node = element;
      node && node !== document.body;
      node = node.parentElement
    ) {
      parts.unshift(
        node.tagName + ':' + [...node.parentElement.children].indexOf(node)
      )
    }
    /** @lang zh-CN 换行链接按每段实际片段检查，包围框空白不代表可命中内容。 @lang en Check actual fragments of wrapped links because bounding-box whitespace is not hittable content. */
    const hit = [...element.getClientRects()].some((rect) => {
      /** @lang zh-CN 片段与视口的交集确定本次可见命中点。 @lang en The fragment's viewport intersection determines the visible hit-test point. */
      const left = Math.max(0, rect.left)
      const right = Math.min(innerWidth, rect.right)
      const top = Math.max(0, rect.top)
      const bottom = Math.min(innerHeight, rect.bottom)
      if (right <= left || bottom <= top) return false
      /** @lang zh-CN 覆盖层通过实际命中节点识别。 @lang en Identify occluding layers through the actual hit node. */
      const point = document.elementFromPoint(
        (left + right) / 2,
        (top + bottom) / 2
      )
      return element === point || element.contains(point)
    })
    return {
      key: element === document.body ? 'body' : parts.join('>'),
      text: element.textContent.trim().slice(0, 100),
      skip: element.matches('.skip-link'),
      main: !!element.closest('main'),
      focusVisible: element.matches(':focus-visible'),
      hit
    }
  })
}

/**
 * @lang zh-CN 在确认画布、两语言和六页真实禁脚本指南中执行同一断言。
 * @lang en Execute the same assertion across confirmed canvases, both languages and all six actual no-script guide pages.
 * @param {(page: import('playwright').Page, label: string) => Promise<void>} action <lang><zh-CN>实际原生操作与断言。</zh-CN><en>Actual native actions and assertions.</en></lang>
 * @returns {Promise<void>} <lang><zh-CN>全部路线完成后释放上下文。</zh-CN><en>Release contexts after all routes complete.</en></lang>
 */
async function guidePages(action) {
  for (const width of [1440, 1024, 390, 320]) {
    for (const suffix of ['', '.en']) {
      for (const relative of [
        `index${suffix}.html`,
        `guides/preferences${suffix}.html`,
        `guides/troubleshooting${suffix}.html`
      ]) {
        await scenario(
          width,
          async (page) => {
            await page.setViewportSize({
              width,
              height: width === 1440 ? 900 : width === 1024 ? 768 : 844
            })
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await page.goto(base + 'guides/first-party-preferences/' + relative)
            await action(page, `${width} ${relative}`)
          },
          true
        )
      }
    }
  }
}

test('guide skip focus is visible above the pinned header and resumes in content without scripts', async () => {
  await guidePages(async (page, label) => {
    await page.keyboard.press('Tab')
    // <lang><zh-CN>首焦点改变合成层，禁脚本环境以有界等待核实际绘制完成。</zh-CN><en>Initial focus changes compositing; use a bounded wait for painted hit testing when scripts are disabled.</en></lang>
    await page.waitForTimeout(100)
    /** @lang zh-CN 首Tab必须同时具备原生身份、可见焦点和真实命中。 @lang en First Tab must provide native identity, visible focus and an actual hit. */
    const first = await guideFocus(page)
    assert.ok(
      first.skip && first.focusVisible && first.hit,
      label + JSON.stringify(first)
    )
    await page.keyboard.press('Enter')
    await page.waitForURL('**#main-content')
    await page.waitForTimeout(100)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    /** @lang zh-CN 原生片段激活后顺序从正文继续。 @lang en Sequential navigation resumes within content after native fragment activation. */
    const after = await guideFocus(page)
    assert.ok(after.main && after.hit, label + JSON.stringify(after))
  })
})

test('guide complete forward and reverse focus stays visible under the pinned header without scripts', async () => {
  await guidePages(async (page, label) => {
    await page.keyboard.press('Tab')
    /** @lang zh-CN 首节点只作循环边界，其层级另有独立回归。 @lang en The first node marks the cycle boundary, with stacking covered by a separate regression. */
    const first = await guideFocus(page)
    /** @lang zh-CN 完整前向节点身份供逆序逐项比较。 @lang en Complete forward identities support exact reverse-order comparison. */
    const forward = []
    for (const key of ['Tab', 'Shift+Tab']) {
      /** @lang zh-CN 每个方向独立保存顺序与终止状态。 @lang en Each direction retains its own order and termination state. */
      const order = []
      let complete = false
      for (let step = 0; step < 160; step += 1) {
        // <lang><zh-CN>保持真实按下阶段，让原生滚动在keyup前推进；瞬时按下/释放在Windows禁脚本宿主可留下屏外焦点。</zh-CN><en>Hold the key-down phase so native scrolling advances before keyup; instantaneous press/release can leave focus offscreen in Windows script-disabled hosts.</en></lang>
        await page.keyboard.press(key, { delay: 50 })
        await page.waitForTimeout(25)
        /** @lang zh-CN 首轮不可命中时再等原生滚动稳定，避免暂态误判。 @lang en Wait for native scrolling to settle when an initial hit fails, avoiding transient findings. */
        let current = await guideFocus(page)
        if (current.key === 'body') continue
        if (current.key === first.key) {
          complete = true
          break
        }
        if (!current.hit) {
          await page.waitForTimeout(200)
          current = await guideFocus(page)
        }
        assert.ok(
          current.hit && current.focusVisible,
          label + ' ' + key + JSON.stringify(current)
        )
        order.push(current.key)
      }
      assert.ok(complete, label + ' incomplete ' + key)
      if (key === 'Tab') forward.push(...order)
      else assert.deepEqual(order, [...forward].reverse(), label)
    }
  })
})

test('guide A4 print preserves source text and fits every visible code token within its block', async () => {
  for (const suffix of ['', '.en']) {
    await scenario(
      794,
      async (page) => {
        await page.setViewportSize({ width: 794, height: 1123 })
        await page.goto(
          base +
            `guides/first-party-preferences/guides/preferences${suffix}.html`
        )
        /** @lang zh-CN 屏幕原文作为打印逐字符事实源，样式不能改写它。 @lang en Screen text is the character-exact source for print and must not be rewritten by styling. */
        const before = await page.locator('pre').allTextContents()
        await page.emulateMedia({ media: 'print' })
        /** @lang zh-CN 使用非空白token的实际行片段核容器裁剪，避免PDF文字提取隐藏的裁切。 @lang en Check actual non-whitespace token fragments against clipping bounds rather than trusting PDF text extraction. */
        const blocks = await page.locator('pre').evaluateAll((nodes) =>
          nodes.map((pre) => {
            /** @lang zh-CN 每段示例保留自己的纸面边界。 @lang en Each example retains its own paper bounds. */
            const bounds = pre.getBoundingClientRect()
            /** @lang zh-CN 原生文本树包含内嵌的双语注释span。 @lang en The native text tree includes embedded bilingual-comment spans. */
            const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
            const clipped = []
            for (let node = walker.nextNode(); node; node = walker.nextNode()) {
              for (const match of node.textContent.matchAll(/\S+/gu)) {
                /** @lang zh-CN 单token可能被合法折为多行，各行均应在容器内。 @lang en A token may legally wrap across lines, each of which must fit its container. */
                const range = document.createRange()
                range.setStart(node, match.index)
                range.setEnd(node, match.index + match[0].length)
                if (
                  [...range.getClientRects()].some(
                    (rect) =>
                      rect.left < bounds.left - 1 ||
                      rect.right > bounds.right + 1
                  )
                )
                  clipped.push(match[0])
              }
            }
            return { width: pre.clientWidth, scroll: pre.scrollWidth, clipped }
          })
        )
        assert.deepEqual(await page.locator('pre').allTextContents(), before)
        assert.ok(
          blocks.every(
            (block) =>
              block.scroll <= block.width + 1 && block.clipped.length === 0
          ),
          JSON.stringify(blocks)
        )
        /** @lang zh-CN 同时走真实Chromium A4导出入口，产物仅在本测试内存中使用。 @lang en Also exercise Chromium's real A4 export, retaining output in test memory only. */
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: false
        })
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
        assert.ok(pdf.length > 1024)
      },
      true
    )
  }
})

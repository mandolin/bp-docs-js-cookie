/**
 * @module bp-docs-js-cookie/hia-docs-sanitize-test
 * @lang zh-CN 验证公开清洗保留已授权源的可信行范围，且不带出源码正文或猜测未知范围；仅用合成数据。
 * @lang en Verifies that public sanitization retains trusted line ranges for authorized sources without carrying source bodies or guessing unknown ranges; uses synthetic data only.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeJsonValue } from './sanitize.mjs'

/** @lang zh-CN 构造同一路径的声明锚点与parser确认的完整块；正文仅为隐私哨兵。 @lang en Builds a same-path declaration anchor and parser-confirmed complete block; the body is only a privacy sentinel. */
function sourceFixture() {
  return {
    source: {
      model: 'hia-jsdoc-source', mode: 'all',
      definedIn: { relativePath: 'src/api.mjs', position: { line: 66, column: 2 }, range: { start: { line: 66, column: 2 }, end: { line: 66, column: 2 } } },
      primaryBlock: { relativePath: 'src/api.mjs', rangeSource: 'parser-js', confidence: 'high', range: { start: { line: 66 }, end: { line: 93 } }, content: 'SYNTHETIC_PRIVATE_SOURCE_BODY', preview: { content: 'SYNTHETIC_PRIVATE_SOURCE_BODY' } }
    },
    i18n: { fields: { description: { localizedText: { 'zh-CN': '公开说明', en: 'Public description' } } } }
  }
}

/** @lang zh-CN 完整行范围不依赖被删除正文，输入与双语文案均保持。 @lang en Complete line ranges survive body removal while inputs and bilingual prose remain unchanged. */
test('retains a trusted public source range without its body or input mutation', () => {
  const input = sourceFixture()
  const before = structuredClone(input)
  const result = sanitizeJsonValue(input)
  assert.deepEqual(result.source.definedIn.range, { start: { line: 66 }, end: { line: 93 } })
  assert.deepEqual(result.source.definedIn.position, input.source.definedIn.position)
  assert.deepEqual(result.i18n, input.i18n)
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_SOURCE_BODY'), false)
  assert.equal(result.source.primaryBlock, undefined)
  assert.deepEqual(input, before)
  assert.deepEqual(sanitizeJsonValue(result), result)
})

/** @lang zh-CN 不提升启发式、异路径、未授权源、无效范围或禁用源码模式。 @lang en Does not promote heuristic, mismatched-path, unauthorized-source, invalid-range or disabled-source inputs. */
test('does not invent full ranges from untrusted or unrelated source metadata', () => {
  for (const change of [
    (value) => { value.source.primaryBlock.rangeSource = 'heuristic' },
    (value) => { value.source.primaryBlock.confidence = 'none' },
    (value) => { value.source.primaryBlock.relativePath = 'src/assign.mjs' },
    (value) => { value.source.primaryBlock.relativePath = value.source.definedIn.relativePath = '../private.mjs' },
    (value) => { value.source.primaryBlock.range.end.line = 1 },
    (value) => { value.source.primaryBlock.range.start.line = '66' },
    (value) => { value.source.mode = 'none' }
  ]) {
    const input = sourceFixture()
    change(input)
    assert.deepEqual(sanitizeJsonValue(input).source.definedIn.range, input.source.definedIn.range)
  }
})

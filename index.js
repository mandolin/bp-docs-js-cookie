/**
 * <lang><zh-CN>js-cookie 的 CommonJS 兼容入口；运行时实现来自同一提交构建出的分发文件。</zh-CN><en>The CommonJS compatibility entry for js-cookie; its runtime implementation comes from the distribution file built from the same commit.</en></lang>
 *
 * @module js-cookie
 * @lang zh-CN 向 `require('js-cookie')` 调用方公开浏览器 Cookie API，不在入口层复制实现。
 * @lang en Exposes the browser Cookie API to `require('js-cookie')` callers without duplicating the implementation at the entry layer.
 */

// <lang><zh-CN>CommonJS 条件导出保持指向上游 Rollup 产物；源码文档化不得改变包的既有加载路径。</zh-CN><en>The CommonJS conditional export remains pointed at the upstream Rollup artifact; source documentation must not change the package's established loading path.</en></lang>
module.exports = require('./dist/js.cookie')

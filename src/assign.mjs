/**
 * <lang><zh-CN>提供 js-cookie 内部使用的浅层可枚举属性合并辅助函数。</zh-CN><en>Provides the shallow enumerable-property merge helper used internally by js-cookie.</en></lang>
 *
 * @module js-cookie/assign
 * @lang zh-CN 该模块刻意保持小型 ES5 风格循环，并拒绝 `__proto__` 写入。
 * @lang en This module deliberately keeps a small ES5-style loop and rejects `__proto__` writes.
 */

/**
 * <lang><zh-CN>按从左到右顺序把一个或多个 source 的 `for...in` 可枚举属性浅复制到 target。</zh-CN><en>Shallow-copies `for...in` enumerable properties from one or more sources into a target from left to right.</en></lang>
 *
 * @param {Object} target <lang><zh-CN>接收后续属性写入并最终返回的可变目标对象。</zh-CN><en>The mutable target that receives subsequent property writes and is returned.</en></lang>
 * @param {...Object} sources <lang><zh-CN>按调用顺序覆盖同名键的来源对象。</zh-CN><en>Source objects whose same-named keys overwrite earlier values in call order.</en></lang>
 * @returns {Object} <lang><zh-CN>传入并已完成浅层合并的同一个 target 引用。</zh-CN><en>The same target reference after the shallow merge.</en></lang>
 * @lang zh-CN 为保持上游兼容性，继承的可枚举键也会被复制；`__proto__` 始终跳过，以免该辅助函数成为原型修改入口。
 * @lang en For upstream compatibility, inherited enumerable keys are copied too; `__proto__` is always skipped so this helper cannot become a prototype-mutation entry point.
 */
export default function (target) {
  // <lang><zh-CN>索引从 1 开始，因为 arguments[0] 是可变 target，其余参数才是按优先级排列的 source。</zh-CN><en>The index starts at 1 because arguments[0] is the mutable target and the remaining arguments are precedence-ordered sources.</en></lang>
  for (var i = 1; i < arguments.length; i++) {
    // <lang><zh-CN>当前 source 只在本轮外层迭代中使用；后出现的 source 会覆盖先前同名键。</zh-CN><en>The current source lives only for this outer iteration; later sources overwrite earlier same-named keys.</en></lang>
    var source = arguments[i]
    // <lang><zh-CN>按原实现枚举当前 source 的全部 `for...in` 可见键；这包括继承的可枚举键。</zh-CN><en>Enumerate every `for...in`-visible key from the current source as the original implementation does; this includes inherited enumerable keys.</en></lang>
    for (var key in source) {
      // <lang><zh-CN>`__proto__` 无论来自自有还是继承枚举都不得写入，其他枚举键保持上游覆盖语义。</zh-CN><en>`__proto__` must not be assigned whether it is own or inherited; all other enumerable keys retain upstream overwrite semantics.</en></lang>
      if (key === '__proto__') continue
      // <lang><zh-CN>通过门禁的值按引用浅复制；本函数不克隆嵌套对象。</zh-CN><en>Values that pass the gate are copied shallowly by reference; this function does not clone nested objects.</en></lang>
      target[key] = source[key]
    }
  }
  // <lang><zh-CN>返回原 target 以支持现有的属性组合表达式，不创建额外对象。</zh-CN><en>Return the original target to support existing attribute-composition expressions without allocating another object.</en></lang>
  return target
}

# 架构与调用链 / Architecture and Call Flow

## 一张最小心智模型

```text
CommonJS require ──> index.js ──> dist/js.cookie.js

ES module source ──> src/api.mjs ──> assign.mjs
                         │
                         └──────────> converter.mjs
```

`index.js` 是 package 的 CommonJS 兼容入口，它加载 Rollup 生成的 `dist/js.cookie.js`。`src/api.mjs` 是运行时源实现：
`init()` 把 converter 与默认属性冻结在一个 API 实例上，`set()` / `get()` 只在被调用时访问 `document.cookie`。
`withAttributes()` 和 `withConverter()` 不修改当前实例，而是合并配置后重新调用 factory。

The CommonJS entry loads the Rollup distribution artifact. The ES-module source keeps runtime behavior in `src/api.mjs`: the factory
freezes a converter and default attributes on each API instance, while `set()` and `get()` access `document.cookie` only when called.
The two `with*` methods derive new configured instances instead of mutating the current one.

## 写入流程

1. 无 DOM 环境立即返回，不执行 converter 或副作用；
2. 合并默认属性与本次属性到新对象；
3. 数字 `expires` 按“天”转换为绝对 Date，再变为 UTC 文本；
4. 编码 Cookie 名称，按枚举顺序序列化启用属性；
5. 非布尔属性只保留首个分号前的值，避免一个值扩展出后续属性；
6. converter 编码值后，唯一副作用是给 `document.cookie` 赋值。

浏览器仍是最终策略 authority。赋值表达式返回字符串并不证明 Cookie 已按调用方意图持久化；domain/path、安全上下文、
容量和用户策略都可能影响结果。

## 读取流程

1. 无 DOM 或显式空名称返回 `undefined`；无参数读取则继续建立 map；
2. 按 `; ` 分隔浏览器返回的 Cookie header；
3. 每项只把第一个等号之前视为名称，其余部分重新拼为值；
4. 名称解码后，只保存第一个可见同名项；
5. 单项 URI 解码失败由 `catch` 隔离，后续项仍可读取；
6. 有名称时返回单值，无参数时返回本次调用建立的 jar。

This per-Cookie error isolation is a resilience boundary, not validation or sanitization. Applications still own trust decisions for
Cookie data before sending it into HTML, commands, storage queries, or other sensitive sinks.

## 对象与配置

`Object.create()` 把共享方法放在 prototype，把 `attributes` / `converter` 作为实例自有的只读、不可枚举描述符；两个配置值
还会分别 `Object.freeze()`。这是浅冻结：嵌套对象若由调用方提供，仍应由调用方负责其生命周期与可变性。

`assign()` 也只做浅复制，并保持上游 `for...in` 语义，因此继承的可枚举键可进入结果。它拒绝名为 `__proto__` 的键，
但不是通用的对象 schema validator。面向不可信属性输入时，调用方仍应使用受控 plain object 与 allowlist。

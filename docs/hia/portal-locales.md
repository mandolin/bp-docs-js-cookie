# Portal language entry points / Portal语言入口

The default documentation Portal has explicit language landing pages at `index.en.html` and `index.zh-CN.html`. They share the same API identities, source links, navigation data, and assets. Both pages contain their initial language in static HTML and remain readable with JavaScript disabled.

默认文档Portal提供明确的英文首页`index.en.html`和简体中文首页`index.zh-CN.html`。二者共用API身份、源码链接、导航数据与资产，静态HTML已包含所选语言，禁用JavaScript时同样可读。

An explicit language link selects that interface language for the visit, including when an opposing device preference exists or browser storage is unavailable. The neutral root URL continues to restore the existing device preference. The interface language control keeps the explicit landing URL synchronized, preserving its query, fragment, and browser-history state. Document-content language retains its existing independent control.

明确语言链接决定本次访问的界面语言，适用于设备已有相反偏好以及浏览器存储不可用的情况。无语言根入口继续恢复既有设备偏好。界面语言控件会同步明确首页地址，并保留查询、片段与浏览器历史状态。文档内容语言继续沿用既有独立控件。

The separate first-party visitor preference guide returns to the Portal in its current language through its ordinary footer link. Its examples describe an illustrative preference model. Interface display preferences and example cookie values have separate purposes.

独立的第一方访客偏好指南通过普通页脚链接返回当前语言的Portal。指南中的业务偏好示例仍属于说明模型，界面显示偏好与示例Cookie值分别承担各自用途。

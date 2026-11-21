# Browser Workflows / 浏览器操作流程

This document adds examples to [SKILL.md](SKILL.md). In DSH, prefer native `dsh-chrome-use`; the CLI is a fallback for environments with an existing compatible CDP Proxy.

本文为 [SKILL.md](SKILL.md) 补充示例。在 DSH 中优先使用原生 `dsh-chrome-use`；CLI 仅用于已有兼容 CDP Proxy 的环境。

## 1. Search and inspect / 搜索与查看

**Native DSH:** open a task-owned tab to the target or search page. Read with `chrome_content`, inspect controls/links with `chrome_snapshot` or `chrome_find`, then follow actual page links. Cite primary sources for factual research.

**DSH 原生：**在任务专属标签打开目标页或搜索页。用 `chrome_content` 读取正文，`chrome_snapshot` 或 `chrome_find` 检查控件和链接，再跟随页面实际链接。事实调研尽量引用一手来源。

**CLI fallback / CLI 兜底:**

```sh
node scripts/cdp.mjs open https://example.com
node scripts/cdp.mjs info TARGET_ID
node scripts/cdp.mjs dom TARGET_ID
```

## 2. UI / frontend testing / UI 与前端测试

1. Inspect the page and relevant controls first.
2. Install CLI `instrument` before reproducing, or use DSH `doctor`, `logs`, and `network` for native diagnostics.
3. Perform one user-visible action at a time; wait/assert the expected result.
4. Verify URL and rendered state; capture a screenshot when useful.
5. Inspect errors/network, then clean up the task-owned tab.

1. 先检查页面和相关控件。
2. 复现前先运行 CLI `instrument`；原生路径用 DSH `doctor`、`logs`、`network` 查看诊断。
3. 一次只执行一个用户可见操作，并等待/断言预期结果。
4. 核对 URL 和渲染状态，必要时截图。
5. 查看错误/网络结果后清理任务标签。

CLI instrumentation applies only to events after installation in the current document and captures only some console/runtime errors and fetch/XHR metadata. It does not collect request/response bodies or headers, and can miss WebSockets, workers, and earlier activity. Reinstall after navigation/reload.

CLI 监测只覆盖当前文档里安装之后发生的部分控制台/运行时错误及 fetch/XHR 元数据，不收集请求/响应正文和 headers，可能漏掉 WebSocket、worker 和安装前活动；导航/刷新后需重新安装。

## 3. Element debugging / 元素调试

- **DSH:** use fresh `chrome_snapshot` refs, `chrome_find` for semantic controls, `chrome_content` for readable page text, `chrome_scrape` for structured fields, and `chrome_screenshot` for visual state. Use narrowly scoped `chrome_evaluate` only when simpler tools are insufficient.
- **CLI:** `dom <target> [selector]` returns bounded text/HTML and candidate controls; use `eval` for focused computed-style, geometry, or attribute checks. Return serializable values, not DOM nodes.

- **DSH：**用最新 `chrome_snapshot` 获取有效 ref，`chrome_find` 查语义控件，`chrome_content` 读正文，`chrome_scrape` 提取结构字段，`chrome_screenshot` 检查视觉状态。简单工具不够时才用范围明确的 `chrome_evaluate`。
- **CLI：**`dom <target> [selector]` 返回有限长度的文字/HTML 和候选控件；用 `eval` 定向检查计算样式、坐标或属性。返回可序列化值，不返回 DOM 节点。

## 4. Forms and clicks / 填表和点击

Inspect exact controls, fill/select/check/click, then verify the resulting UI. Prefer semantic accessible roles/names and current refs over guessed CSS selectors. If a synthetic click is insufficient, use the native pointer action or the Proxy's `/clickAt` when supported. Upload only files explicitly selected by the user.

先核实控件，再填写、选择、勾选或点击，并检查页面结果。优先使用可访问性角色/名称和最新 ref，不猜 CSS selector。模拟点击无效时，使用原生指针操作，或在 Proxy 支持时调用 `/clickAt`。只上传用户明确指定的文件。

Submitting may send messages, publish content, purchase, delete, or otherwise affect external systems. Require explicit user authorization for the exact action. Never log secrets.

提交可能发送消息、发布内容、购买、删除或影响外部系统。执行具体动作前必须取得用户明确授权，不记录秘密信息。

## 5. Network and error investigation / 接口与报错排查

- **Native DSH:** use `chrome_doctor` for readiness/challenge/network health; `chrome_logs` for console/runtime events; `chrome_network` to list observed requests; and `chrome_wait_response` for a specific response. Read a body only if needed and authorized; it may contain sensitive or untrusted data.
- **CLI fallback:** run `instrument` before reproduction, then inspect `errors` and `network`. This is page instrumentation, not complete network capture.

- **DSH 原生：**用 `chrome_doctor` 检查页面状态、挑战与网络健康；`chrome_logs` 查看控制台/运行时事件；`chrome_network` 列出已观察请求；用 `chrome_wait_response` 等待具体响应。仅在必要且获授权时读取正文；其中可能包含敏感或不可信数据。
- **CLI 兜底：**复现前运行 `instrument`，之后查看 `errors` 和 `network`。这是页面内监测，不是完整网络抓取。

## 6. Responsive and visual checks / 响应式与视觉检查

Use native `chrome_emulate` for viewport, mobile mode, color scheme, reduced motion, locale/timezone, or network conditions. Reset overrides afterward. Capture screenshots at the intended viewport and assert visible content/state. The CLI fallback does not provide equivalent emulation and assertion tools.

使用原生 `chrome_emulate` 测视口、移动模式、配色、减少动态效果、语言/时区或网络条件；完成后重置覆盖。目标视口截图并断言可见内容/状态。CLI 兜底不提供同等的模拟与断言工具。

## 7. Cleanup / 清理

Release claimed tabs and close only tabs opened for this task. Never close existing user tabs. DSH cleanup closes task-owned tabs; with CLI, call `close` using the exact target ID returned by `open`. Keep shared Proxies running unless their owner asks otherwise.

释放认领的标签，只关闭本任务新建的标签，绝不关闭用户已有标签。DSH cleanup 清理任务标签；CLI 用 `open` 返回的准确 target ID 调用 `close`。除非 Proxy 所有者要求，否则保持共享 Proxy 运行。

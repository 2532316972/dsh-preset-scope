# dsh-session-toolkit — 合并规格（内部文档，不随包发布）

把两个 MIT 插件合并成一个包。**不重写逻辑，只搬代码 + 改身份字符串 + 改模块边界。**

## 目标包

- 目录：`G:\Projects\dsh-session-toolkit`
- 包名 / Cordis 名 / 客户端 loader id：`dsh-session-toolkit`
- 纯 ESM，**无构建链**（没有 rolldown/tsdown/vitest），源码即产物

## 最终文件布局

| 文件 | 谁负责 | 内容 |
| --- | --- | --- |
| `package.json` | lead | 已完成 |
| `cordis.patch.yml` | lead | 单行 insert |
| `lib/index.js` | lead | 组合根：`export { apply, inject, name }` |
| `lib/preset.js` | task-1 | preset 半个 host，`export function mountPresetRoutes(ctx, hooks)` |
| `lib/scope.js` | task-2 | scope 半个 host，`export function mountScope(ctx)` → `{ rewarmAgent }` |
| `lib/client.js` | task-3 | 合并后的单一客户端 bundle |
| `test/manifest.test.js` | lead | 已完成（清单/身份一致性） |
| `test/preset-routes.test.js` | task-1 | 路由行为 |
| `test/scope-routes.test.js` | task-2 | 路由行为 + rewarm |
| `test/client-slots.test.js` | task-3 | 挂载契约 |
| `locale/{en,zh}.json`、`icon.svg`、`README.md`、`LICENSE` | lead | 展示元数据 |
| `vendor/` | 不动 | 两个原始 bundle，仅作参考，不发布 |

## 路由前缀（唯一真相源，两端必须一致）

| 用途 | 旧 | 新 |
| --- | --- | --- |
| preset API（POST） | `/preset-switch/api` | `/session-toolkit/preset` |
| scope 概览（GET） | `/api/dsh-workspace-scope/overview` | `/session-toolkit/scope/overview` |
| scope 保存（POST） | `/api/dsh-workspace-scope/save` | `/session-toolkit/scope/save` |

host 侧 `register({ kind: 'prefix', path: '/session-toolkit/preset' })` 与
`path: '/session-toolkit/scope'` 两个 prefix 互不覆盖（前缀不同）。

## 身份字符串改名表

改这些（纯标识/文案，无行为影响）：

- `name` 常量、`exports.name`、loader `id`、patch row → `dsh-session-toolkit`
- `exports.name`（客户端）→ `dsh-session-toolkit`
- 错误信息前缀 `dsh-workspace-scope: ` → `dsh-session-toolkit: `
- `ctx.effect` 标签 → `dsh-session-toolkit: <用途>`
- slot `registrant` → `dsh-session-toolkit`
- 样式标签 `tagId` = `dsh-session-toolkit/styles.module.css`，`ownerId` = `dsh-session-toolkit`，
  `data-plugin-css` 选择器同步
- preset 下拉 DOM id：`dsh-preset-switcher-overlay` / `-menu`
  → `dsh-session-toolkit-preset-overlay` / `-menu`
- `console.info` 标签 `[preset-switcher]` → `[session-toolkit]`
- 客户端 CSS 类名前缀 `wsc-` **不改**（纯内部样式，改它要动 900 行，收益为零）

**绝对不要改**（磁盘/兼容接缝）：

- `.dsh-scope.json`、`.dsh-scope.sessions.json` 文件名 —— 用户工作区里已有的配置要继续生效
- 环境变量 `DSH_WORKSPACE_SCOPE_GLOBAL_DIR`
- `PRESET_LABELS` 里的模式中文名

## 模块边界

### `lib/preset.js`

从 `lib/preset-switcher.js` 派生。文件内私有：`PresetSwitchError`、`readJson`、`writeJson`、
`writeOk`、`writeError`、`canonicalHost`、`isTrustedApiRequest`、`inspectStored`、
`storedPresetOf`、`selectionEvent`、`repairOne`。

导出：

```js
export const PRESET_ROUTE_PREFIX = '/session-toolkit/preset';
export function mountPresetRoutes(ctx, hooks) { /* 原 apply 的函数体 */ }
```

`hooks` 可选：`{ afterRecompose?: (agent, preset) => Promise<void> | void }`。
在 live 分支 `agentPresets.recompose(...)` **成功之后**调用它；钩子抛错时
**不能让请求失败**（preset 其实已经切了），把原因塞进响应的 `warning` 字段。

### `lib/scope.js`

从 `lib/workspace-scope.js` 派生。`registerRuntimePolicy` 要额外返回
`{ warmAgent, refreshPolicies }`（内部已有这两个函数，只需回传）。

导出：

```js
export const SCOPE_ROUTE_PREFIX = '/session-toolkit/scope';
export function mountScope(ctx) { /* 原 apply 的函数体 */ return { rewarmAgent }; }
```

`rewarmAgent(agent)` 语义：清掉该 agent 在 `activePolicies` 里的旧条目（调用其
cleanup 并 delete）、`shadows.drop(agent.id)`、然后 `await warmAgent(agent)`。
这是 preset 切换后的必需动作——recompose 会重建 agent scope，旧的策略缓存失效，
而 `agent/pre-step` 钩子在缺条目时会直接抛错。

### `lib/client.js`

单一 `window.__ModuleLoader__.load({ id: "dsh-session-toolkit", factory })`。
一个 `exports.name` / `exports.inject = ["slots"]` / 一个 `exports.apply`。
两个 half 的 `module`/`exports` 声明只保留一份。

`apply` 里注册三个 slot，每个都包在 `ctx.effect(fn, label)` 里：

| slot | id | order | label |
| --- | --- | --- | --- |
| `conversation.session.header.actions` | `preset-switch` | 15 | 切换模式 |
| `conversation.input.right` | `workspace-scope` | 30 | 工作区能力 |
| `shell.overlay` | `workspace-scope-modal` | 50 | — |

样式注入必须从 factory 作用域搬进 `apply`（ui-plugin 契约：factory 必须无副作用），
并用 `ctx.effect` 返回清理函数 `() => tag.remove()`。

## 运行环境

Node 不在 PATH。测试一律用：

```
& 'D:\DeepSeek Harness\resources\runtime\primary-runtime\dependencies\node\bin\node.exe' --test 'test/<file>.test.js'
```

（`--test` 必须给具体文件路径，给目录会 MODULE_NOT_FOUND。）

工作目录：`G:\Projects\dsh-session-toolkit`。

## TDD 纪律

1. 先写测试，跑一次，**记录红灯输出**（失败原因必须是"功能缺失"，不是语法错）。
2. 再写实现，跑到绿灯。
3. 断言只打公共接缝（导出的函数、注册出去的 route handler、注册出去的 slot），
   不要去断言私有函数或实现细节。
4. 报告里必须贴红灯 + 绿灯两次的 pass/fail 计数。

## 许可

两个上游都是 MIT。`LICENSE` 要保留两份版权声明：
`Copyright (c) 2026 jeffcwj`（preset-switcher 上游）与
`Copyright (c) 2026 dsh-workspace-scope contributors`。

# dsh-session-toolkit

两个 DSH 插件合并成一个包：**会话标题栏切换 Agent 预设** + **按工作区 / 会话 / 全局收窄 Skills 与 MCP 工具**。

合并来源（均为 MIT）：

| 上游 | 作者 | 本包里的位置 |
| --- | --- | --- |
| [`dsh-preset-switcher`](https://github.com/jeffcwj/dsh-preset-switcher) | jeffcwj | `lib/preset.js`、`lib/client.js` 的 preset 段 |
| `dsh-workspace-scope` | dsh-workspace-scope contributors | `lib/scope.js`、`lib/client.js` 的 scope 段 |

两个上游原本各自往 `conversation.session.header.actions`、`conversation.input.right`、
`shell.overlay` 挂 UI，路由也不冲突，所以合并主要是把两份 host 与两份 client 收进
一个包、一个 loader 行、一个 `apply`，再统一改名。

## 功能

### 切换模式（预设）

会话标题栏右侧的下拉按钮，列出所有可用 Agent 预设（标准 / PTC / 极简 / 创造）。

- 会话已打开：直接 `agentPresets.recompose` 重建该会话的 agent scope，立刻生效。
- 会话未打开：把选择记录成一条 `agent-preset/selected` 事件，重新打开会话时生效。
- 子代理会话不允许改预设。

### 工作区能力

输入框右侧的「工作区能力」按钮，打开一个覆盖层面板，分三档收窄能力：

| 档位 | 配置文件 | 作用范围 |
| --- | --- | --- |
| 全局 | `$DSH_WORKSPACE_SCOPE_GLOBAL_DIR/.dsh-scope.json` | 所有工作区 |
| 工作区 | `<cwd>/.dsh-scope.json` | 该目录下新开的会话 |
| 会话 | `<cwd>/.dsh-scope.sessions.json` | 该会话 |

每一档对 Skills 与 MCP 工具各有 `default` / `whitelist` / `blacklist` 三种模式，
由外到内逐层求值（外层 `default` 表示继承内层）。**配置只影响新开的会话**——
已经在跑的会话需要重开才吃到新策略。

## 安装

包目录安装（本地开发）：

```
plugin_manager → action: install_bundle → target: G:\Projects\dsh-session-toolkit
```

安装后需要**重启 DSH**：客户端 bundle 是 JS 模块，宿主只在启动时求值一次。

## 与两个上游的关系

本包是**独立实现**，不依赖也不替换上游包。装本包之前请先卸掉
`dsh-preset-switcher` 与 `dsh-workspace-scope`——否则会出现两套 UI
（每个包各挂一次 slot），标题栏会看到两个下拉按钮。

改名对照：

| 项 | 上游 | 本包 |
| --- | --- | --- |
| 包名 / loader id | `dsh-preset-switcher`、`dsh-workspace-scope` | `dsh-session-toolkit` |
| preset API | `POST /preset-switch/api` | `POST /session-toolkit/preset` |
| scope API | `/api/dsh-workspace-scope/{overview,save}` | `/session-toolkit/scope/{overview,save}` |
| 配置文件 | `.dsh-scope.json` | **不变**（磁盘上已有配置继续生效） |
| 全局目录环境变量 | `DSH_WORKSPACE_SCOPE_GLOBAL_DIR` | **不变** |

## 开发

无构建链，`lib/` 下的文件就是产物。

```powershell
& 'D:\DeepSeek Harness\resources\runtime\primary-runtime\dependencies\node\bin\node.exe' --test 'test/manifest.test.js'
```

`--test` 必须给具体文件路径（给目录会 `MODULE_NOT_FOUND`）。

| 测试 | 覆盖 |
| --- | --- |
| `test/manifest.test.js` | 四个身份接缝一致、导出形状、展示元数据 |
| `test/preset-routes.test.js` | preset 路由注册、信任围栏、方法守卫、切换成功与 re-warm 失败降级 |
| `test/scope-routes.test.js` | scope 路由注册、overview / save、404、`rewarmAgent` |
| `test/client-slots.test.js` | 单条 loader 行、三个 slot、样式注入与清理、无残留旧身份 |

`vendor/` 下是两个上游的原始 bundle，仅作对照参考，不随包发布。
`MERGE-SPEC.md` 是这次合并的内部规格（路由前缀、改名表、模块边界）。

## 已知限制

- **上游更新不自动跟进**：合并后 `dsh-preset-switcher` 与 `dsh-workspace-scope`
  的后续修复需要手工搬过来。
- **样式类名前缀仍是 `wsc-`**（上游缩写）。纯内部样式，不影响任何外部契约。
- 两个上游的验证基线不同：preset 侧在 DSH `0.2.1-rc.2` 验过，scope 侧 `v0.6.0`
  只在 `0.1.6-alpha.2` 验过。本包在 DSH `0.2.2-rc.5` 上重新验证。

## 许可

MIT。见 [LICENSE](LICENSE)，其中保留两份上游版权声明。

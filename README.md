# dsh-preset-scope

两个 DSH 插件合并成一个包：**会话标题栏切换 Agent 预设** + **按工作区 / 会话 / 全局收窄 Skills 与 MCP 工具**。

合并来源（均为 MIT）：

| 上游 | 作者 | 本包里的位置 |
| --- | --- | --- |
| [`jeffcwj/dsh-preset-switcher`](https://github.com/jeffcwj/dsh-preset-switcher) | jeffcwj | `lib/preset.js`、`lib/client.js` 的 preset 段 |
| [`Ri0n72Y/dsh-workspace-scope`](https://github.com/Ri0n72Y/dsh-workspace-scope) | Ri0n72Y | `lib/scope.js`、`lib/client.js` 的 scope 段 |

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
| 全局 | `~/.dsh/.dsh-scope.json`（`DSH_WORKSPACE_SCOPE_GLOBAL_DIR` 可换目录） | 所有工作区 |
| 工作区 | `<cwd>/.dsh-scope.json` | 该工作区下的会话 |
| 会话 | `~/.dsh/.dsh-scope.sessions.json`（同一目录） | 该会话的一行 |

每一档对 Skills 与 MCP 工具各有 `default` / `whitelist` / `blacklist` 三种模式，由外到内叠加：
全局 → 工作区 → 会话，任一层 `allow` 名单都优先放行。

- 工作区 `default`：完全跟随全局。
- 工作区 `whitelist`：封闭世界，未列出的能力一律禁用，全局不参与（`allow` 可例外）。
- 工作区 `blacklist`：`deny = 自己的名单 ∪ 全局禁用 − allow`，没提到的能力继承全局。
- 会话 `default`：跟随叠加后的工作区结果；`whitelist` / `blacklist` 规则同上，继承值来自工作区。

改动即时保存，并在**回合边界**生效：空闲会话在下一次回复前应用新策略，正在跑的回合保持
当前策略、到下一回合才拾取（不会在同一回合里反复增删工具）。不需要重开会话。

工作区或会话首次定制后新装的 Skill / MCP（该层没提到的名字）默认跟随继承层判定，不会因为
「曾经全开」就自动启用；想放行被继承层禁用的能力，手动打开即写入一条 `allow` 例外。

### 面板

Skills 与 Host 全局 MCP 合在一个列表里，用「技能 / MCP」药丸切换，固定高度内部滚动；
搜索框过滤当前组，全部启用 / 全部禁用也只作用于当前组。点开一行看详情，技能描述可点
「翻译」按需翻成中文（走 Edge 翻译接口，失败回退 MyMemory；动态沙箱里不可用）。

页签徽标表示这一档的状态：`已自定义` / `跟随全局`（工作区）/ `跟随工作区`（会话）。
会话页签有「恢复跟随工作区」，点了会删掉该会话在 `~/.dsh/.dsh-scope.sessions.json` 里的那一行。

### 记住上次打开的页签

面板默认打开**上一次停留的那一档**，而不是每次都跳回「工作区」。这是本包相对上游的界面行为改动：

- 值存在 `localStorage` 的 `dsh-preset-scope.scope-tab`，只认 `global` / `workspace` / `session`。
- 值非法、为空或存储被禁用时回落到「工作区」，与上游一致。
- 记忆是**按浏览器**的阅读位置，不写进任何项目配置文件；换浏览器或清站点数据即回到默认。
- 打开时若还拿不到会话 id（新建会话尚未落盘），会话那一档回到「工作区」，不会指向不存在的策略。

## 安装

### 从 GitHub 安装（推荐）

`dsh plugin` 是官方插件入口，参数原样转发给 pnpm 并在当前 profile 里执行 `pnpm add`：

```bash
dsh plugin --profile desktop add github:2532316972/dsh-preset-scope
```

把 `desktop` 换成你实际用的 profile 名（`dsh web` 等于 `--profile web`；先跑过 `dsh web`
或 `dsh headless` 一次，profile 目录才会自动初始化）。

### 从插件市场安装

装好 [dshmarket](https://dshmarket.com) 后，打开 **插件 → 插件市场**，搜
`dsh-preset-scope` 点安装即可——市场对 GitHub 源拼的是 `github:2532316972/dsh-preset-scope`，
和上面的 CLI 命令是同一条规格。

### 包目录安装（本地开发）

```
plugin_manager → action: install_bundle → target: G:\Projects\dsh-session-toolkit
```

`install_bundle` 只接受**绝对目录**，不接受包名；用包名安装请走上面两条。

安装后需要**重启 DSH**：客户端 bundle 是 JS 模块，宿主只在启动时求值一次。

## 与两个上游的关系

本包是**独立实现**，不依赖也不替换上游包。装本包之前请先卸掉
`dsh-preset-switcher` 与 `dsh-workspace-scope`——否则会出现两套 UI
（每个包各挂一次 slot），标题栏会看到两个下拉按钮。

改名对照：

| 项 | 上游 | 本包 |
| --- | --- | --- |
| 包名 / loader id | `dsh-preset-switcher`、`dsh-workspace-scope` | `dsh-preset-scope` |
| preset API | `POST /preset-switch/api` | `POST /preset-scope/preset` |
| scope API | `/api/dsh-workspace-scope/{overview,save}` | `/preset-scope/scope/{overview,save}` |
| 配置文件 | `.dsh-scope.json` | **不变**（磁盘上已有配置继续生效） |
| 全局目录环境变量 | `DSH_WORKSPACE_SCOPE_GLOBAL_DIR` | **不变** |

scope 段对应上游 `Ri0n72Y/dsh-workspace-scope` 的 `v0.6.0`（`main` 的 `71db3f5`，仓库未打 tag；三档策略、
层叠判定、回合边界生效、技能描述翻译都在），另加本包自己的「记住上次页签」；
preset 段对应 `jeffcwj/dsh-preset-switcher` 的当时版本。

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
| `test/client-slots.test.js` | 单条 loader 行、三个 slot、样式注入与清理、无残留旧身份、能力面板记住上次页签 |
| `test/composition.test.js` | 组合根：导出形状、inject 并集、两个路由前缀都挂上、scope 先于 preset、切预设后重热 scope |

`lib/client.js` 是**生成物**，别手改。它由 `tools/merge-client.mjs` 从 `vendor/preset-client.js`
与 `vendor/scope-client.js` 按行区间拼出、再统一改名：

```powershell
& 'D:\DeepSeek Harness\resources\runtime\primary-runtime\dependencies\node\bin\node.exe' 'tools/merge-client.mjs'          # 重新生成 lib/client.js
& 'D:\DeepSeek Harness\resources\runtime\primary-runtime\dependencies\node\bin\node.exe' 'tools/merge-client.mjs' --check  # 只校验是否过期
```

改客户端行为请改脚本里的补丁段（页签记忆就是在那里加的），不要直接编辑产物。
脚本里每个锚点都断言只匹配一次，上游挪行会直接报错，不会吐出半截 bundle。

`vendor/` 下是两个上游的原始 bundle，仅作对照参考，不随包发布。
`MERGE-SPEC.md` 是这次合并的内部规格（路由前缀、改名表、模块边界）。

## 已知限制

- **上游更新不自动跟进**：合并后 `dsh-preset-switcher` 与 `dsh-workspace-scope`
  的后续修复需要手工搬过来。
- **样式类名前缀仍是 `wsc-`**（上游缩写）。纯内部样式，不影响任何外部契约。
- 两个上游的验证基线不同：preset 侧在 DSH `0.2.1-rc.2` 验过，scope 侧 `v0.6.0`
  只在 `0.1.6-alpha.2` 验过。本包在 DSH `0.2.2-rc.5` 上重新验证。
- **技能描述翻译依赖外网**（Edge 翻译，回退 MyMemory），离线时点「翻译」会报错。

## 许可

MIT。见 [LICENSE](LICENSE)，其中保留两份上游版权声明。
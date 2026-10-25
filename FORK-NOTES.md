# FORK-NOTES · 本仓库与上游的差异

> 这是一个 **fork**，不是原版。
> 上游：`https://github.com/lianginx/dsh-quote-selection` @ `7039316fff030ee0361956093ed0745fd7bc48b7`
> 本 fork 的改动时间：2026-10-05

---

## 一句话

**功能整体换了。** 上游是「选中对话文字 → 引用成 Markdown 引用块」；
本 fork 改成了「**跨会话轮次引用**」——点在任意一轮对话的底部，把这一轮**索引**成
`@turn:N` 发出去，host 半区在 `agent/pre-step` 阶段把索引解析成真正的上下文，
所以既能引用本会话的轮次，也能引用**其他会话**的轮次。

## 与上游逐文件对照

| 文件 | 状态 |
|---|---|
| `index.js`（host 半区） | **完全重写**（上游 9 行空壳 → 本 fork 431 行实现） |
| `client.js`（browser 半区） | **完全重写**（上游是选区浮动「引用」按钮 → 本 fork 是每轮底部的两个按钮） |
| `package.json` | **已改**：`name` → `dsh-turn-reference`、`version` → `0.3.0`、description/keywords 重写；`exports`/`files`/`engines` 结构沿用上游 |
| `cordis.patch.yml` | 结构同上游，`id` / `name` 随包名改为 `turn-reference` / `dsh-turn-reference` |
| `README.md` / `README.zh.md` | **已重写**，改为描述轮次引用功能（上游版讲的还是选中引用） |

## 当前功能

每轮对话的 footer 上（`conversation.chat.turnTail` 链，在自带的 copy/时间/分支行之前）多两个按钮：

| 按钮 | 行为 |
|---|---|
| **索引本轮** | 往输入框插入 `@turn:N` —— 只发索引，不发原文；host 在 `agent/pre-step` 解析 |
| **复制跨会话** | 复制 `@turn:N "<会话 id 前缀>"` 到剪贴板；粘到**任何**会话的输入框都能解析 |

token 语法：

```
@turn:13            → 当前会话的第 13 轮
@turn:13 "视频会话"  → 标题含「视频会话」的那个会话的第 13 轮
```

选择器也可以是**至少 8 字符的 session id 前缀**。引号是必需的：
选择器可能含空格，没有引号会吞掉后面整句。

## 实现要点（改代码前先看这几条）

- `agent/pre-step` 监听用 `prepend: true`，先于下游监听器拿到消息。
- 只扫描 `source.kind === 'user'` 的直接用户消息 —— 这样注入的上下文不会被二次处理。
- 解析走 `ctx.sessionQuery`（和 `@deepseek-ai/dsh-session-reference` 相同的受支持读路径）。
- 聚合成**一条** `user/message` 引用，紧跟在引用它的那条消息之后，标记为「不可信的只读背景」。
- 上限：`MAX_REFERENCES = 8`、`MAX_TURN_CHARS = 8000`、`MAX_TOTAL_CHARS = 24000`。
- **歧义选择器绝不猜**：多个会话都匹配时直接报「不可读」，避免挂错内容。
- `source` 标记沿用官方 recall 的形态（`form: 'recall'` + `references[]`），
  所以前端是用现成的 recall 行渲染（带保留/省略条数），不是一坨不透明内容。

## 改名带来的两个后果

1. **包名变了 → 已装的 profile 依赖会断。** 从 `dsh-quote-selection` 换成 `dsh-turn-reference` 之后，
   原 profile 里那条旧的依赖不再指向本插件，必须重新 `remove` 旧的、`add` 新的。已装过的地方
   （本地 desktop profile、仙宫云容器 web profile）都要改。
2. **好处是：更新上游不会覆盖本 fork 了。** 两个包名并存互不干扰，`dsh plugin update dsh-quote-selection`
   只动上游那份。

## 兼容性

- `peerDependencies` 为空，不挑 DSH 版本。
- 实测运行环境：DSH `0.2.1-rc.3`（本地 Windows 桌面版 / 仙宫云容器 `web` profile 均通过）。
- `engines.node`：`^22.19.0 || >=24.0.0`。

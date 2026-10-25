# dsh-turn-reference

DeepSeek Harness（DSH）Web UI 插件：**按轮次索引引用对话**（可以跨会话引用），不用复制粘贴原文。

fork 自 [`lianginx/dsh-quote-selection`](https://github.com/lianginx/dsh-quote-selection) @ `7039316`，
上游功能是「选中文字 → 引用成 Markdown 引用块」。**本 fork 功能已变**，差异见 [`FORK-NOTES.md`](./FORK-NOTES.md)。

---

## 功能

每轮对话底部多两个按钮：

| 按钮 | 行为 |
|---|---|
| **索引本轮** | 往输入框插入 `@turn:N`——只发索引，不发原文 |
| **复制跨会话** | 复制 `@turn:N "<会话 id 前缀>"` 到剪贴板；粘到**任何**会话的输入框都能解析 |

host 半区在 `agent/pre-step` 阶段解析索引，把被引用的轮次作为「不可信的只读背景」挂到消息后，
前端用自带的 recall 行渲染（带保留/省略条数），不是一坨不透明内容。

### token 语法

```
@turn:13              → 当前会话的第 13 轮
@turn:13 "视频会话"   → 标题含「视频会话」的会话的第 13 轮
```

选择器也可以是**至少 8 字符的 session id 前缀**。引号必需：选择器可能含空格，没有终止符会吞掉后面整句。
**歧义选择器绝不猜**——多个会话都匹配时直接报「不可读」，避免挂错内容。

---

## 安装

```bash
# 从 git（宿主机要能访问 github.com）
pnpm dsh plugin --profile <profile> add github:<owner>/dsh-turn-reference

# 或从本地目录 / tarball（绝对路径，带引号）
pnpm dsh plugin --profile <profile> add "/abs/path/dsh-turn-reference-0.3.0.tgz"
```

**不需要构建**：纯 ESM、无依赖，`exports` 直接指向 `index.js` / `client.js`。

需要 Node `^22.19.0 || >=24.0.0`。实测于 DSH `0.2.1-rc.3`（Windows 桌面版 + Linux 容器 `web` profile）。

---

## 上限（host 侧常量）

| 常量 | 值 | 含义 |
|---|---|---|
| `MAX_REFERENCES` | 8 | 单条消息最多引用 8 轮 |
| `MAX_TURN_CHARS` | 8000 | 单轮字符预算 |
| `MAX_TOTAL_CHARS` | 24000 | 总字符预算 |
| `ID_PREFIX_MIN` | 8 | session id 前缀最短长度 |

---

## 注意

包名与上游**不同**（`dsh-turn-reference` vs `dsh-quote-selection`），所以装/更新上游不会覆盖本 fork，反之亦然。

---

MIT © 上游作者；fork 改动见 `FORK-NOTES.md`。

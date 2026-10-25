# dsh-turn-reference

A DeepSeek Harness (DSH) Web UI plugin: **cite any conversation turn — including turns from
other sessions — by index, instead of copy-pasting text.**

Forked from [`lianginx/dsh-quote-selection`](https://github.com/lianginx/dsh-quote-selection)
@ `7039316`, whose feature was "quote a text selection as a Markdown blockquote".
**The functionality is now different** — see [`FORK-NOTES.md`](./FORK-NOTES.md).

---

## What it does

Every completed turn gets two extra buttons in its footer:

| Button | Effect |
|---|---|
| **索引本轮** (Index this turn) | Inserts `@turn:N` into the composer — an *index*, never the exchange text |
| **复制跨会话** (Copy cross-session) | Copies `@turn:N "<session id prefix>"` to the clipboard; paste it into **any** session and it still resolves |

The host half resolves the token at `agent/pre-step` and attaches the referenced turns as
untrusted, read-only background — rendered through the shipped *recall* row (with kept/omitted
counts), not as an opaque blob.

### Token syntax

```
@turn:13              → turn 13 of the current session
@turn:13 "视频会话"   → turn 13 of the session whose title contains that text
```

The selector may also be a session-id prefix of at least 8 characters. Quotes are required: a
selector may contain spaces, and without a terminator it would swallow the rest of the message.
An ambiguous selector is **never guessed** — it is reported as unreadable.

---

## Install

```bash
# from git (requires network access to github.com from the host running dsh)
pnpm dsh plugin --profile <profile> add github:<owner>/dsh-turn-reference

# or from a local checkout / tarball (absolute path)
pnpm dsh plugin --profile <profile> add "/abs/path/dsh-turn-reference-0.3.0.tgz"
```

No build step: plain ESM, no dependencies, `exports` points straight at `index.js` / `client.js`.

Requires Node `^22.19.0 || >=24.0.0`. Tested on DSH `0.2.1-rc.3` (Windows desktop, and a Linux
container running the `web` profile).

---

## Limits (host side)

| Constant | Value | Meaning |
|---|---|---|
| `MAX_REFERENCES` | 8 | at most 8 cited turns per message |
| `MAX_TURN_CHARS` | 8000 | per-turn character budget |
| `MAX_TOTAL_CHARS` | 24000 | total character budget |
| `ID_PREFIX_MIN` | 8 | minimum session-id prefix length |

---

## Caveat

This fork is a **different package name** from upstream (`dsh-turn-reference` vs
`dsh-quote-selection`), so installing or updating upstream will not overwrite it — and vice versa.

---

MIT © upstream authors; fork changes as noted in `FORK-NOTES.md`.

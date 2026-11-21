/* global window, document, navigator */
/**
 * Turn-reference browser half — cross-session edition.
 *
 * Two actions sit in every completed Turn's footer (the
 * `conversation.chat.turnTail` chain, just before the shipped copy/clock/branch
 * row):
 *
 *   索引本轮      inserts `@turn:N` into the composer draft — an index, never
 *                 the exchange text. The host resolves it at `agent/pre-step`.
 *   复制跨会话    copies `@turn:N "<session-id-prefix>"` to the clipboard. Paste
 *                 that into ANY other session's composer and it still resolves,
 *                 because the token carries the identity of the session it came
 *                 from. That is the whole cross-session mechanism: no picker, no
 *                 host round-trip in the browser.
 *
 * `@` is the reference-menu trigger, so hand-writing `@turn:13` pops the
 * completion menu mid-typing. The menu shows no matching candidates for this
 * prefix and closes, so it is noise rather than a hazard; the bracket form that
 * avoided it was traded away for a notation users already know.
 *
 * LAYOUT: `conversation.chat.turnTail` renders into a COLUMN flex container
 * (`TurnTailNodeView.module.css: .root { display:flex; flex-direction:column }`).
 * A bare button there is stretched to the full column width and stacked 16px
 * apart. Both actions therefore live in ONE row wrapper that opts out of the
 * stretch with `align-self: flex-start`.
 *
 * Fork of lianginx/dsh-quote-selection @ 7039316 (upstream quoted a text selection
 * through a floating overlay). `dsh plugin update` will overwrite this file.
 */
window.__ModuleLoader__.load({ id: 'dsh-turn-reference', factory: (require) => {
var module = { exports: {} };
var exports = module.exports;

const React = require('react')

const BUTTON_CSS = [
  // One row for both actions: the parent is a column flex, so a bare button
  // would stretch to full width and each one would land on its own 16px row.
  '.dshq-turn-row {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '  align-self: flex-start;',
  '}',
  '.dshq-turn {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 4px;',
  '  padding: 1px 8px;',
  '  border: 1px solid var(--dsw-alias-border-l2);',
  '  border-radius: 999px;',
  '  background: var(--dsw-alias-bg-base);',
  '  color: var(--dsw-alias-label-primary);',
  '  font-family: var(--dsw-font-family);',
  '  font-size: 12px;',
  '  line-height: 1.7;',
  '  white-space: nowrap;',
  '  cursor: pointer;',
  '  user-select: none;',
  '  opacity: .6;',
  '  transition: opacity 80ms, background-color 80ms;',
  '}',
  '.dshq-turn:hover { opacity: 1; background: var(--dsw-alias-interactive-bg-hover); }',
  '.dshq-turn:focus-visible { opacity: 1; }',
  '.dshq-turn[data-state="error"] { opacity: 1; white-space: normal; max-width: 60vw; text-align: left; }',
  '.dshq-turn[data-state="done"] { opacity: 1; }',
  '.dshq-turn-mark { font-size: 13px; line-height: 1; }',
].join('\n')

if (typeof document !== 'undefined'
  && document.querySelector('style[data-plugin="dsh-turn-reference"]') === null) {
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-turn-reference'
  tag.textContent = BUTTON_CSS
  document.head.appendChild(tag)
}

/** How much of a session id a cross-session token carries. */
const ID_PREFIX = 8
/** Constant head of every session id — slicing it yields the same token for all. */
const SESSION_PREFIX = 'session-'

/** A distinctive slice of a session id, skipping the constant `session-` head. */
function sessionHandle(sessionId) {
  const bare = sessionId.startsWith(SESSION_PREFIX) ? sessionId.slice(SESSION_PREFIX.length) : sessionId
  return bare.replace(/[^0-9a-zA-Z]/g, '').slice(0, ID_PREFIX)
}

/** The composer textarea, widest-to-narrowest probe. */
function composerTextarea() {
  const seat = document.querySelector('[data-composer-seat]')
  if (seat !== null) {
    const inside = seat.querySelector('textarea')
    if (inside !== null) return inside
  }
  const direct = document.querySelector('[data-composer-seat] textarea')
  if (direct !== null) return direct
  const all = document.querySelectorAll('textarea')
  for (let i = 0; i < all.length; i += 1) {
    if (all[i].closest('[data-conversation-scroll]') === null) return all[i]
  }
  return null
}

/** Append one index token to the draft. @returns null on success, else a reason. */
function insertToken(inputActions, token) {
  const ta = composerTextarea()
  const base = ta === null ? '' : ta.value
  if (base.indexOf(token) >= 0) return null
  const trimmed = base.replace(/\s+$/, '')
  const next = (trimmed === '' ? '' : trimmed + ' ') + token + ' '
  if (inputActions !== undefined && inputActions !== null && typeof inputActions.setDraft === 'function') {
    try {
      inputActions.setDraft(next)
    } catch (error) {
      return 'setDraft threw: ' + String(error && error.message ? error.message : error).slice(0, 80)
    }
  } else if (ta !== null) {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      setter.call(ta, next)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    } catch (error) {
      return 'dom write threw: ' + String(error && error.message ? error.message : error).slice(0, 80)
    }
  } else {
    return 'no composer textarea found'
  }
  return null
}

/** Copy one token to the clipboard. Prefers the async Clipboard API and falls
 *  back to execCommand('copy') where that API is missing or refuses the write
 *  (insecure context, denied permission, unfocused document).
 *  @returns null on success, else a reason. */
async function copyToken(token) {
  let apiError = null
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined
      && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(token)
      return null
    }
  } catch (error) {
    apiError = error
  }
  // The async API is absent or refused the write; execCommand still succeeds while
  // the click's transient activation is valid.
  try {
    if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
      const focused = document.activeElement
      const el = document.createElement('textarea')
      el.value = token
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.left = '-9999px'
      try {
        document.body.appendChild(el)
        el.select()
        if (document.execCommand('copy')) return null
      } finally {
        el.remove()
        if (focused !== null && typeof focused.focus === 'function') focused.focus({ preventScroll: true })
      }
    }
  } catch (fallbackError) {
    // Both paths failed; the reason reported below comes from the Clipboard API.
    void fallbackError
  }
  const detail = apiError !== null && apiError.message ? String(apiError.message) : ''
  return detail === '' ? '剪贴板不可用' : '复制失败: ' + detail.slice(0, 80)
}

module.exports = {
  name: 'turn-reference',
  inject: ['timer', 'locale'],
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    const t = ctx.locale.bind('turn-reference')
    ctx.effect(
      () => ctx.locale.register('turn-reference', {
        zh: {
          indexTurn: '索引本轮',
          done: '已索引',
          copyTurn: '复制跨会话',
          copied: '已复制',
          hintInsert: '把本轮作为参考（只插入索引，不贴正文）',
          hintCopy: '复制成可跨会话使用的索引，粘到别的会话里发送',
        },
        en: {
          indexTurn: 'Index turn',
          done: 'Indexed',
          copyTurn: 'Copy cross-session',
          copied: 'Copied',
          hintInsert: 'Reference this turn (inserts an index only, never the text)',
          hintCopy: 'Copy as a cross-session index; paste it into another session',
        },
      }),
      'turn-reference: dictionaries',
    )

    /** One index action per completed Turn. */
    function TurnIndexAction(props) {
      const stateHook = React.useState(null)
      const state = stateHook[0]
      const setState = stateHook[1]
      React.useEffect(() => {
        if (state === null) return undefined
        const dispose = ctx.timeout(() => setState(null), state.kind === 'done' ? 1400 : 12000)
        return () => { if (typeof dispose === 'function') dispose() }
      }, [state])

      const turn = props.turn.turn
      const sessionId = typeof props.sessionId === 'string' ? props.sessionId : ''
      const localToken = '@turn:' + turn
      const handle = sessionId === '' ? '' : sessionHandle(sessionId)
      const crossToken = handle === ''
        ? null
        : '@turn:' + turn + ' "' + handle + '"'

      const onInsert = () => {
        const reason = insertToken(props.inputActions, localToken)
        setState({ which: 'insert', ...(reason === null
          ? { kind: 'done', text: t('done') }
          : { kind: 'error', text: reason }) })
      }
      const onCopy = () => {
        if (crossToken === null) {
          setState({ which: 'copy', kind: 'error', text: '拿不到会话标识' })
          return
        }
        void copyToken(crossToken).then((reason) => {
          setState({ which: 'copy', ...(reason === null
            ? { kind: 'done', text: t('copied') }
            : { kind: 'error', text: reason }) })
        })
      }

      const insertLabel = state !== null && state.which === 'insert' ? state.text : t('indexTurn')
      const copyLabel = state !== null && state.which === 'copy' ? state.text : t('copyTurn')

      return React.createElement('span', { className: 'dshq-turn-row' },
        React.createElement('button', {
          type: 'button',
          className: 'dshq-turn',
          'data-state': state !== null && state.which === 'insert' ? state.kind : undefined,
          title: t('hintInsert') + '  ' + localToken,
          onClick: onInsert,
        },
        React.createElement('span', { className: 'dshq-turn-mark' }, '\u29C9'),
        insertLabel),
        React.createElement('button', {
          type: 'button',
          className: 'dshq-turn',
          'data-state': state !== null && state.which === 'copy' ? state.kind : undefined,
          title: t('hintCopy') + (crossToken === null ? '' : '  ' + crossToken),
          onClick: onCopy,
        },
        React.createElement('span', { className: 'dshq-turn-mark' }, '\u29C9'),
        copyLabel))
    }

    slots.inject('conversation.chat.turnTail', () => slots.register(
      { name: 'conversation.chat.turnTail', id: 'turn-reference-turn', order: -10 },
      TurnIndexAction,
    ))
  },
}

return module.exports; } });

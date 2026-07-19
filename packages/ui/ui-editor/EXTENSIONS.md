# CodeMirror Extensions

Public extensions exported by this package, grouped by their theme folder under `src/extensions/`.
Each is a value (or factory) you drop into an editor's `extensions` array.

```text
extensions/
  core/
    createBasicExtensions         — base editor: keymaps, history, brackets, read-only, wrapping, tabs
    createThemeExtensions         — base theme, fonts, syntax highlighting, slot classNames, scrollbar
    createDataExtensions          — wire document sync (automerge) + presence (awareness) for an accessor
    tabbable                      — set tabindex=0 so the editor is tab-focusable
    filterChars                   — transaction filter stripping matching chars from inserts
    modes                         — map of input-mode keymap bundles (default / vscode / vim)
  state/
    focus / focusField            — track focus/blur into a boolean StateField
    busy / busyState              — shared "busy" boolean StateField
    modalStateField               — boolean "modal/popover active" flag
    selectionState                — persist/restore scroll + selection per document id
    documentId                    — single-value facet for the current document id
  behavior/
    submit                        — Enter = submit (+clear), Shift-Enter = newline
    listener                      — fire callbacks on focus change / doc change
    dropFile                      — accept external file drops with a file-only drop cursor
    lineSpacing                   — add vertical padding to each line
    bookmarks                     — bookmarks StateField + Mod-Arrow navigation
  decoration/
    annotations                   — wavy-underline decoration over regex matches
    hashtag                       — replace #tag with a styled atomic widget
    marker (markerTheme)          — shared hue-tinted marker theme (surfaces + inline buttons)
    blocks                        — draw each top-level block as a box with a drag-handle to reorder
    fader                         — fade-in glow on appended text, expiring on a timer
    pos / posTheme / posPopover   — part-of-speech marks, underline theme, hover popover
    replacer                      — typing auto-replacements (`-->` → `→`)
    comments                      — comment-thread ranges: cursors, highlight layer, cut/paste restore
    assistant                     — LLM proofreading linter drawing underlines + lint panel
  language/
    json/
      createJsonExtensions        — JSON language + parse / AJV-schema linter
    markdown/
      createMarkdownExtensions    — base markdown language, GFM tags, highlight, keymaps
      decorateMarkdown            — WYSIWYG decorator (headings, lists, tasks, quotes, code, links, HR)
      image                       — replace image links with `<img>` block widgets
      table                       — replace GFM tables with rendered `<table>` widgets
      linkTooltip                 — hover preview for markdown links
      formattingKeymap            — meta-b / meta-i toggle strong / emphasis
      formattingListener          — debounced Formatting-state publisher
      formattingStyles            — theme CSS for HR, lists, quotes, code, tasks, tables, images
      adjustChanges               — auto-link pasted URLs, fix task markers
      markdownHighlightStyle      — HighlightStyle for lezer markdown tags
    tags/
      xmlTags                     — render registered XML tags as native / React-portal widgets
      xmlBlockDecoration          — "bubble"-style `<tag>…</tag>` blocks without replacing source
      xmlFormatting               — mark XML tag delimiters/content via a lang-xml parser
      extendedMarkdown            — markdown + mixed XML parser so tags parse as single blocks
  collab/
    automerge/
      automerge                   — two-way sync the editor with an Automerge string
    awareness/
      awareness                   — render remote peers' selections/carets (presence)
      SpaceAwarenessProvider      — mesh-channel provider for `awareness`
  completion/
    mention                       — `@`-mention autocomplete source
    typeahead                     — line-end completion placeholder; Tab/ArrowRight inserts hint
    placeholder                   — transient placeholder at the caret on an empty line
    autocomplete                  — inline ghost-text suggestion (⚠ deprecated — use `typeahead`)
  streaming/
    scrolling/
      scroller                    — bundle crawler + optional autoScroll for streaming views
      crawler                     — spring crawler following the doc bottom; line-jump effects
      autoScroll                  — pin-to-bottom streaming policy with scroll-to-bottom button
      scrollbarAutohide           — macOS-style overlay scrollbar, fades after idle
      scrollPastEnd               — bottom padding so the last line can scroll to the top
    pending/
      pendingText                 — render externally-streamed pending text with confirm/cancel
      pendingTextState            — StateField holding the pending buffer
    typewriter                    — buffer appended text and drip it per-frame
  structure/
    outliner/
      outliner                    — composite outliner: commands, selection, tree, menu, decorations
      commands                    — outliner keymap (indent, continuation, move, delete, toggle-task)
      editor                      — transaction filter enforcing valid cursors & tree-preserving edits
      outlinerTree                — StateField building a shadow tree of list items
      menu                        — floating action button beside the active line
    folding/
      folding                     — generic code-fold gutter with caret marker + theme
      turnFolding                 — turn-response folding driven by a custom gutter + TurnSource
  demo/
    blast                         — particle "code blast" cursor effect
    snippets                      — keymap to type demo snippets char-by-char
  debug/
    debugNodeLogger               — log every syntax-tree node type on each update
    debugTree                     — serialise the syntax tree to JSON on state change
```

## Refactoring opportunities

- **Normalise decoration viewport handling** — ⏸ deferred (needs tests first).
  `xmlBlockDecoration`/`xmlFormatting` do a synchronous full-doc scan/parse per
  `docChanged` (already correct, only slow on huge docs). Naive viewport-limiting
  regresses their documented cross-boundary/nested/`skip` behavior, and
  `xmlFormatting` can't reuse CodeMirror's incremental `syntaxTree` (its primary
  language is markdown, not XML), so this needs a proper design + viewport tests.
- **Consolidate streaming primitives** — `crawler`, `scroller`, `autoScroll`,
  `typewriter`, and `pending/*` all deal with "text arriving over time + keep it
  visible". They overlap on scroll-pinning and per-frame scheduling. A shared
  streaming module (`streaming/`) with one scheduler would reduce drift (e.g.
  `typewriter`'s frame-budget constants already disagree with their docs).
- **Collapse the deprecated `autocomplete`** into `typeahead` and drop it from
  the barrel; it is dead legacy API.
- **Remove empty options scaffolding** — `HighlightOptions`, `TableOptions`,
  `FormattingOptions`, `OutlinerProps`, `TreeOptions` are `{}` with unused
  `_options` params. Either make them `factory-noargs` or give the option a
  purpose.

## Errors & anti-patterns

### No-cast-rule violations (`as any` / `as unknown` / non-null `!`)

Per repo policy these must be fixed at the source, not cast away:

- `automerge/update-codemirror.ts:93` `patch.value as any`
- `scrolling/auto-scroll.ts:218` `Domino.of('dx-icon' as any)`; `:238`
  `scrollDOM.parentElement!`
- `automerge/automerge.ts:28`, `automerge/sync.ts:64-65` `handle.doc()!`
- `markdown/decorate.ts` & `markdown/formatting.ts` — many `.exec(...)![0]`,
  `firstChild!`, `.parent!`
- `factories.ts` `as TransactionSpec`, `as ChromaticPalette | undefined`
- `comments.ts` `StateEffect<any>[]`, `as HTMLElement`
- `json.ts` / `assistant.ts` `err: any`, `as Error`
- `selection.ts` `debounce(setState!, …)` — non-null on an optional
- `typewriter.ts` `.filter(Boolean) as Extension[]`
- `blast.ts` `this._node!`, `particle.drag!`, `this._ctx!`

### Hygiene

- **Left-in debug logging** in hot paths: `automerge/sync.ts`
  (`log('onEditorChange')`), `outliner/editor.ts` (`log('change'…)`), `mention.ts`
  (`log.info` on every completion). Gate behind a `debug` option or remove.
- **Dead / commented code**: `awareness.ts:130-136`, `match.ts:41-42`,
  `sync.ts:71-72`, `outliner/editor.ts:113-116`, `outliner/menu.ts:66-71`,
  `selection.ts` scroll handlers; dense `TODO(burdon)` clusters throughout.
- **Type shadowing** — `selection.ts` exports a type `EditorSelection` that
  shadows CodeMirror's `EditorSelection` class.
- **DOM-at-construction** — `assistant.ts` reads
  `getComputedStyle(document.documentElement)` when the factory runs, coupling
  extension creation to a live DOM/theme.
- **Hardcoded colors** (should map to theme tone tokens): `fader.ts`
  `rgba(100,200,255,…)`; `tags/xml-formatting.ts` `var(--color-blue-500)`.
- **Exported mutable singleton** — `blast.ts` `defaultOptions` is a shared
  mutable object consumers can mutate.
- **TS `private` vs ES `#private`** — several plugin/widget classes
  (`autocomplete.ts`, `awareness.ts`, `scrollbar-autohide.ts`) use the TS
  `private` keyword; new code should prefer `#private`.
- **Not-actually-extensions** re-exported through the extension barrels:
  `markdownHighlightStyle` (returns `HighlightStyle`), `markdownTagsExtensions` /
  `defaultExtensions` (return `MarkdownConfig[]`). Document or rename so they are
  not mistaken for droppable extensions.

### Review follow-ups (deferred from the reorg PR #12264)

Non-trivial correctness/behavior findings from the review of pre-existing (relocated)
code. Deferred out of the reorg to keep it low-risk; each warrants its own change +
test.

- **`collab/automerge/update-automerge.ts`** — changes from multiple transactions are
  collected then reversed together; a later transaction's offsets are relative to the
  doc after the earlier ones, so applying them out of order corrupts the doc. Collect
  and reverse **per transaction**, applied in order.
- **`structure/outliner/editor.ts`** — the `transactionFilter` validates against the
  local selection and can **cancel non-user transactions** (Automerge sync / programmatic
  edits), diverging the document; bypass validation unless `tr.annotation(Transaction.userEvent)`.
  Also the marker-deletion branch mixes start/new-state coordinates (`tr.state.doc.lineAt(fromA)`
  with `fromA` from the start state); derive the remaining line text from the start state.
- **`language/markdown/table.ts`** — `TableWidget.eq()` compares `header?.join()` /
  `rows?.join()`; `join()` on `string[][]` is ambiguous when cells contain commas, so
  structurally-different tables can compare equal and skip re-render. Compare structurally
  (e.g. `JSON.stringify`).
- **`behavior/submit.ts`** — Shift-Enter inserts `\n` at the main head instead of using
  `state.replaceSelection('\n')`; it ignores selected ranges and additional cursors.
- **`demo/snippets.ts`** — `items[index++]` with `index === items?.length` can read
  `undefined` (crash on `text[…]`) when `items` is empty; guard empty and wrap with `>=`.
- **`streaming/pending/pending-text-stream.ts`** — `dispose()` doesn't stop an in-flight
  `#runPostProcess()`; a late `replaceFinal()` can dispatch into a destroyed `EditorView`.
  Add a disposed flag and a null check for `postProcess`.
- **`streaming/scrolling/auto-scroll.ts`** — the scroll-button `ViewPlugin` appends
  `buttonContainer` to `scrollDOM.parentElement` (outside CM's DOM) and never removes it;
  add `destroy()`. Also the no-cast items below.
- **`completion/typeahead.ts`** — `update()` recomputes `onComplete`/decorations on every
  `ViewUpdate`; guard on `docChanged || selectionSet` like `placeholder.ts`.
- **`decoration/comments.ts`** — non-null `comment.cursor!` (twice); encode the
  cursor-required invariant in the state type or guard before use.
- **`collab/awareness/awareness-provider.ts`** — `update()` / `_handleQueryMessage()` use
  `invariant(this._postTask)`; prefer optional chaining so a message during async teardown
  is a safe no-op.
- **`@dxos/ui` `Domino.of`** — no overload for custom-element tags, forcing
  `Domino.of('dx-icon' as any)` at call sites; add a `string` overload returning
  `Domino<HTMLElement>`.
- **No-cast cleanups** (see the list above) — `auto-scroll.ts` `dx-icon as any` +
  `parentElement!`, and the other pre-existing `!`/`as any` sites.
- **Test conventions** (path guideline) — several relocated test files import `expect`
  from `vitest` rather than the test context and place helpers above the suite; migrate
  incrementally (e.g. `markdown/formatting.test.ts`, `language/xml/*.test.ts`).

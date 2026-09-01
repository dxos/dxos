# Ark utilities — migration analysis

Which `@ark-ui/react` **utilities** (as opposed to component machines) are worth adopting now that
the Tree rebuild has put Ark in the dependency graph. Companion to [TREE.md](./TREE.md), which
covers the machines and the bundle economics; the component-level conclusion there is that Ark's
shared Zag runtime (~24.5 KB raw) is already paid for, so what matters per utility is its
**marginal** cost on top of the Tree, not its standalone size.

Measured against `@ark-ui/react` **5.39.1** (the current latest) with esbuild, React externalized,
minified. "Marginal" = added to a bundle that already contains `TreeView` + `createTreeCollection`.

## Summary

| Utility            | Marginal raw | Marginal brotli | Incumbent                                   | Verdict                                          |
| ------------------ | -----------: | --------------: | ------------------------------------------- | ------------------------------------------------ |
| `focus-trap`       |      +15,851 |          +3,849 | `@radix-ui/react-focus-scope` (1 call site) | **No** — and not a tabster fix                   |
| hotkeys            |      +17,874 |          +4,953 | `@dxos/keyboard` (236 lines, 8+ packages)   | **No**, unless we build a keybinding editor      |
| `format/*`         |       +3,456 |          +1,062 | ad-hoc `Intl.*` in ~5 files                 | **Maybe** — cheapest, but needs `LocaleProvider` |
| `frame`            |       +2,017 |            +679 | 11 `<iframe>` sites                         | **No** — solves the opposite problem             |
| `download-trigger` |       +1,610 |            +627 | `@dxos/util` `downloadBlob`                 | **No** — would regress Tauri                     |

Nothing here is a clear win. The most useful output of this analysis is two findings that have
nothing to do with Ark: **§6** (download call sites that should use the existing helper) and the
confirmation in **§1** that Ark does not answer the tabster question.

## 1. `focus-trap` — does not address tabster

Ark's `FocusTrap` is a **modal trap**: it confines Tab to a subtree and restores focus on exit.
Tabster's job in DXOS is the opposite kind of thing — `useArrowNavigationGroup` and
`useFocusableGroup` build **roving-tabindex focus zones** over composite widgets, where Tab moves
_past_ the group and arrows move _within_ it. One confines focus; the other distributes it. Swapping
in `FocusTrap` would remove none of the tabster surface.

The incumbent is also fine. `@radix-ui/react-focus-scope` + `react-focus-guards` appear in exactly
one file — [`react-ui/src/components/Popover/Popover.tsx`](../../react-ui/src/components/Popover/Popover.tsx)
— and every other modal surface gets its trap free inside Radix Dialog/Popover. Paying +15,851 raw to
replace a trap Radix already provides, in one file, buys nothing.

**Verdict: no.** The tabster replacement still needs a hand-written roving-tabindex/groupper hook;
see TREE.md §7 and the `ark` project ledger.

## 2. hotkeys — capable, but we already have one

Ark 5.39.1 does ship hotkeys, despite there being no `hotkeys` directory under `dist/components`:
they live in `dist/providers` and are exported from the package root — `useHotkey`,
`useHotkeyStore`, `createHotkeyStore`, `useHotkeyRecorder`, `useHotkeyRegistrations`,
`useFormatHotkey`, `parseHotkey`, `formatHotkey`, `isHotkeyEqual`, `validateHotkey`.

**They are barrel-only.** The package's `exports` map sends `./*` to `./dist/components/*/index.js`,
so `@ark-ui/react/providers` does not resolve — the import has to come from `@ark-ui/react` itself.
That is tolerable (TREE.md §6 measured the barrel as tree-shaking identically to the deep subpaths)
but it is a deviation from how the Tree imports Ark.

The incumbent is [`@dxos/keyboard`](../../../common/keyboard/src/keyboard.ts): 236 lines, a
context-scoped `bind`/`unbind` registry with `setCurrentContext`/`getBindings`, consumed by
`react-ui-menu`, `react-ui-attention`, `app-toolkit` and five plugins. Replacing it costs +17,874 raw
/ +4,953 brotli.

What Ark adds that we do not have: a **recorder** (capture a chord from the user), a
**platform-correct formatter** (`⌘K` vs `Ctrl+K`), and a registrations store you can enumerate.
Those are exactly the pieces you need for a user-facing keybinding editor or a discoverable shortcut
list, and building them ourselves is not free either.

**Verdict at the time: no on size alone; revisit if a keybinding editor or shortcut palette becomes
real work.**

### Revisited 2026-09-01 — adopted, but not through Ark

`@dxos/keyboard` is deleted and hotkeys now run on Zag's store
([`@dxos/react-focus`](../../react-primitives/react-focus/docs/FOCUS.md)). Two things changed the
answer:

- **It stopped being about size alone.** The incumbent's dispatch fired only the most specific
  matching binding, and its "context" was a single mutable path string that every consumer had to
  save and restore by hand — `Preview.tsx` and `useArticleKeyboardNavigation` each hand-rolled the
  same save/restore dance. It also had no way to express "only while this surface is attended"
  except by owning the global cursor. Three keyboard systems existed (`@dxos/keyboard`,
  `react-hotkeys-hook` in the canvas editor, and the focus-group handlers); consolidating them was
  the actual motive, and the size question is downstream of it.
- **The barrel finding above is exactly the trap it warned about.** Ark's hooks being barrel-only is
  not merely "a deviation": these bindings register at startup, so importing them put **60 Ark
  modules and 61 Zag modules (~248 KB of source) into the EAGER boot graph** — 23 preload entries,
  4.23 MB — where Zag had previously lived only in the lazy `react-ui-list` chunk. That would have
  eaten the entire tabster win.

  The resolution is to skip Ark's React layer: `@zag-js/hotkeys` is framework-agnostic, depends only
  on `@zag-js/dom-query`, and the hook Ark wraps it in is ~50 lines of registration bookkeeping that
  `react-focus` now owns. That took the graph to **21 entries / 4.20 MB with zero Ark modules** and
  Zag down to 21 modules / 63,557 B.

**If you reach for an Ark provider hook again, measure the boot graph before and after.** The barrel
tree-shakes fine for a component used in one lazy chunk (TREE.md §6) and does not for anything the
app touches at startup.
That is the only scenario where ~18 KB buys something `@dxos/keyboard` cannot.

## 3. `format/*` — the cheapest candidate, with a provider caveat

Four components, +3,456 raw / +1,062 brotli for all of them: `FormatTime`, `FormatNumber`,
`FormatByte`, `FormatRelativeTime`. They are thin wrappers over `Intl.*` from `@zag-js/i18n-utils`.

Two things to weigh:

1. **They are components, not functions.** The API is `<FormatTime value={date} />`, not
   `formatTime(date)`. Anywhere we need a formatted string (a label, an aria-label, a CSV cell)
   they do not apply.
2. **They read locale from Ark's `LocaleProvider`.** `format-time.js` calls `useLocaleContext`, so
   adopting them means mounting that provider above the tree that uses them.

The surface they would consolidate is small and already scattered: five files touch `Intl.*`
directly, plus [`sdk/schema/src/util/formatting.ts`](../../../sdk/schema/src/util/formatting.ts) and
[`react-ui-assistant/.../format-time.ts`](../../react-ui-assistant/src/components/MessageChrome/format-time.ts).

**Verdict: maybe, and lowest priority.** Consolidating our own helpers into one place is the cheaper
first move and does not require a provider. Revisit if we mount `LocaleProvider` for another reason.

## 4. `frame` — solves the opposite problem

Ark's `Frame` renders an `<iframe>` and **portals React children into it**, with a `head` slot — it
is a style-isolation primitive for rendering _our own_ components in a separate document.

All eleven `<iframe>` sites in the repo embed _external_ content: `react-ui/MediaPlayer`,
`plugin-video/VideoPlayer`, `plugin-file/PdfCanvas`, `plugin-inbox/Attachment`,
`plugin-ibkr/TradingViewChart`, and so on. None of them portal React children into the frame, so
`Frame` would not replace any of them.

**Verdict: no for the current codebase.** It becomes a genuine candidate the day we want a
style-isolated preview surface — a rendered email body, a user-authored HTML block, a theme preview
— where leaking app CSS into the content (or vice versa) is the problem being solved.

## 5. `download-trigger` — would regress the desktop build

This is the one that looks cheapest (+1,610 raw / +627 brotli) and is the most clearly wrong.

Ark's `DownloadTrigger` delegates to `downloadFile` in `@zag-js/file-utils`, which builds a blob and
clicks an anchor, with special branches for MS Edge (`msSaveOrOpenBlob`) and macOS WebView. There is
no native file-dialog path.

Our incumbent, [`@dxos/util` `downloadBlob`](../../../common/util/src/download.ts), exists precisely
because that is not sufficient. Its comment records the constraint: the **Tauri webview registers no
download handler, so `<a download>` is silently dropped there**, and the native save dialog
(`@tauri-apps/plugin-dialog` + `plugin-fs`) is the only path that writes anything. It also returns
`false` when the user cancels, and keeps the object URL alive for 30 s because WebKit resolves blobs
asynchronously and revoking in the same task aborts the download.

Composer ships a Tauri desktop build. Adopting `DownloadTrigger` would make downloads silently
no-op there.

**Verdict: no.** The incumbent is strictly more capable, and the gap is not one Ark can close.

## 6. Actionable finding, independent of Ark

Nine files trigger downloads, and several hand-roll the anchor dance instead of calling
`downloadBlob` — which means they carry the Tauri bug the helper exists to fix:

- `plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:197`
- `plugin-table/src/containers/TableArticle/TableArticle.tsx:180`
- `plugin-spacetime/src/engine/stl-export.ts:111`
- `react-ui/src/components/Button/SystemIconButton.tsx:277`
- `stories/stories-inbox/src/modules/ArchiveModule.tsx:35`

Migrating these onto `@dxos/util`'s `downloadBlob` is a small change that fixes real desktop
behaviour. `plugin-inbox/Attachment` and `plugin-file/Preview` use `<a download>` on an addressable
URL rather than a blob, so they need the same treatment only if desktop download is expected to work
there.

## Recommendation

1. Adopt none of these five now.
2. Do the download-helper consolidation in §6 — it is the only concrete defect this analysis found.
3. Keep `format/*` on the list as the one plausible future adoption, gated on whether we ever mount
   `LocaleProvider`.
4. Do not let `focus-trap` be mistaken for progress on tabster; that work is a `@dxos/react-ui`
   roving-tabindex hook, not an Ark adoption.

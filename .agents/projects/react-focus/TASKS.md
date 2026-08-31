# react-focus — Tasks

_Resume: Phase 1 landed on branch `claude/goofy-swartz-03a570`. `@dxos/react-focus` exists and holds
the focus primitives; PR [#12884](https://github.com/dxos/dxos/pull/12884) predates the package and
still describes the react-ui layout — it needs its body refreshed before review. Design:
[`packages/ui/react-primitives/react-focus/docs/FOCUS.md`](../../../packages/ui/react-primitives/react-focus/docs/FOCUS.md)._

## What this project is

One home, below the themed tier, for the three things that decide **what the user is interacting
with and what the keys do**: DOM focus groups, attention/selection state, and hotkeys. Today these
are spread across `@dxos/react-ui` (focus, as of the tabster replacement), `@dxos/react-ui-attention`
(attention + `useArticleKeyboardNavigation`), `@dxos/keyboard` (a hand-rolled context singleton) and
`react-hotkeys-hook` (the canvas editor) — three keyboard systems and a themed dependency the state
layer does not need.

Grew out of [`ark`](../ark/TASKS.md) Phase 5, which replaced `@fluentui/react-tabster`; that work is
complete and is this project's Phase 1.

**The line that must not blur:** a focus group moves DOM focus; attention and selection are state; a
hotkey is a named command. `useArticleKeyboardNavigation` is _a hotkey, scoped by attention, that
moves a selection_ — it never touches focus, which is why it belongs with hotkeys and not with the
mover.

## Phase 1: `@dxos/react-focus` exists — DONE

- [x] **Replace `@fluentui/react-tabster`** with `useFocusGroup` (ark Phase 5) — 68,256 bytes out of
      the eager boot graph against ~6.2 KB in; `tabster`, `keyborg` and the fluentui wrapper gone
      from every `package.json`, the catalog and the lockfile.
- [x] **Create `@dxos/react-focus`** in `packages/ui/react-primitives/`, alongside `react-hooks` /
      `react-input` / `react-list`. Holds `focus.ts`, `useFocusGroup`, `modality.ts` and the design
      doc; `Focus.Group` / `Focus.Item` stay in `@dxos/react-ui` because they need `tx()`.
      All 15 call sites import the new package directly — no compatibility re-exports.
- [x] Package is **public**, not private. `@dxos/react-ui` is public and
      `scripts/check-public-dependencies.mjs` forbids a public package depending on a private one,
      so the AGENTS.md "new packages are private" default cannot apply to a package the themed tier
      consumes. Every sibling in `react-primitives/` is public for the same reason.

## Phase 2: Break attention's themed edge — DONE

`@dxos/react-ui-attention` touched `@dxos/react-ui` in exactly two places, so the state layer was
already headless in everything but its dependency list.

- [x] **Take `ThemedClassName` from `@dxos/ui-types`** in `AttentionProvider.tsx` — it is re-exported
      by `react-ui`, not owned by it.
- [x] **Move `AttentionGlyph` into `@dxos/react-ui`** — the only thing in the package that genuinely
      needed `Icon` and the theme, and presentational throughout (`attended` / `containsAttended` /
      `syncing` / `presence` props, no attention context), so it moved without dragging state with
      it. Two consumers in `plugin-space` repointed; `Syncing` had none outside the package.
- [x] **Drop `@dxos/react-ui` from `peerDependencies`.** It stays a **devDependency** only, because
      `AttentionProvider.stories.tsx` uses `@dxos/react-ui/testing`'s `withTheme` decorator — a
      headless package may still demo itself against the theme. The production dependency, which is
      what the layering claim is about, is gone. `@dxos/util` went too: knip found it unused once
      the glyph left.

Result: `@dxos/react-ui-attention` now depends on `invariant`, `keyboard`, `log`, `react-hooks` and
`ui-types` — nothing from the themed tier.

## Phase 3: Hotkeys on Ark — spike first

`@ark-ui/react@5.39.1` ships `useHotkeys` / `useHotkey` / `HotkeyStore` / `useHotkeyRegistrations` /
`useHotkeyRecorder` over `CommandDefinition` from `@zag-js/hotkeys`, and the Zag runtime is already
paid for by the Tree migration. `@dxos/keyboard`'s own header has asked for this replacement since 2023.

- [x] **Spike — done, and it is viable. No blockers.** Run against `@ark-ui/react@5.39.1` in
      happy-dom; the spike itself was throwaway and is not in the tree.

  - **`disableInput` is Ark's default, and the polarity is inverted.** Store defaults are
    `{ preventDefault: true, stopPropagation: false, enableOnFormTags: false,
enableOnContentEditable: false, capture: true }`, so a command does **not** fire while focus is
    in a text field unless it opts in with `options: { enableOnFormTags: true }` — verified both
    ways. `@dxos/keyboard`'s `disableInput` is opt-**in** (bindings fire everywhere by default), so
    **the migration must add `enableOnFormTags` to every binding that did not set
    `disableInput: true`** — the safe direction is the one that changes behaviour, so it cannot be
    skipped. Only three call sites mention `disableInput` today against ~74 binding sites, so the
    default flips for nearly all of them.
  - **Scopes are a flat active-set, not a hierarchy — and that is enough.** The store exposes
    `addScope` / `removeScope` / `setScope` / `toggleScope` / `getActiveScopes`, with a wildcard
    `'*'` always active. An unscoped command always fires; a scoped one fires only while its scope
    is active. `nestKeyboardContext`'s "a plank inherits root bindings" becomes: root bindings
    unscoped, plank bindings scoped to the plank, activated when attended. What is genuinely lost is
    implicit path-prefix inheritance across more than one level — if a binding relies on a 3-segment
    path inheriting from its grandparent, activation has to add each ancestor scope explicitly.
  - **Attention gating needs no scope machinery at all.** `enabled` accepts a function and is
    evaluated per dispatch, so `enabled: () => hasAttention` is the whole answer, reading React
    state that already exists. Verified: 0 fires while disabled, 1 after enabling.
  - Also noted: `conflictBehavior: 'warn'` by default, and `useHotkeyRegistrations` returns the
    registered commands with `label` / `description` / `category` / `keywords` — which is the
    shortcuts cheatsheet `@dxos/keyboard`'s `data` field was hand-rolling.

- [ ] **Replace `@dxos/keyboard` and `react-hotkeys-hook`** (15 and 3 files respectively) with the
      Ark-backed layer. Three keyboard systems become one, with a rule a reader can apply: DOM
      traversal inside a widget is a focus group; a named command is a hotkey.
- [ ] **Move `useArticleKeyboardNavigation`** onto it, taking `enabled: hasAttention` rather than
      reaching into the attention context — which is what lets it leave the attention package.

## Phase 4: Fold attention in — optional, pure churn

- [ ] **Rename `@dxos/react-ui-attention` to `@dxos/react-focus`'s attention subpath (or module)** —
      **~152 import rewrites across 47 packages**, and AGENTS.md forbids compatibility re-exports, so
      it is all-at-once. Deliberately last: Phases 1-3 deliver the whole architectural benefit, and
      this step buys naming rather than layering. Callable off at any point.

## Open

- [ ] **PR #12884 predates the package.** Its body describes the code living in `@dxos/react-ui` and
      its base is the stacked Tree branch. Refresh or reopen before review.
- [ ] **The Composer app itself is unverified** for the focus work — Deck panes were exercised
      through the `Main` story, not the running app. First thing to do if a focus regression appears.

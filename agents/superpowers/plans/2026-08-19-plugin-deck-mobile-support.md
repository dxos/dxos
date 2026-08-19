# plugin-deck Mobile Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold mobile layout into `plugin-deck` (one layout plugin, one state machine, two root renderers), delete `plugin-simple-layout`, and ship a stripped-down Composer to the iOS simulator showing spaces → Chat → ChatThread with voice input.

**Architecture:** `plugin-deck` gains a `platform: 'mobile' | 'desktop'` option. Desktop renders the existing `DeckLayout`; mobile renders a new `MobileDeckLayout` that projects the _same_ deck state as a UIKit navigation stack (`deck.active` is the stack; Open pushes, Close pops, left-edge swipe-back invokes Close) with a bottom Splitter drawer driven by the complementary-sidebar state. `plugin-simple-layout` is deleted; its `MobileLayout` (iOS keyboard/safe-area), `Home`, `NavBranch` components move into `plugin-deck`.

**Tech Stack:** TypeScript, React, Effect (`effect/unstable/reactivity/Atom`), `@dxos/app-framework` plugins/capabilities, moon, vitest, Storybook, Tauri iOS.

**Spec:** `agents/superpowers/specs/2026-08-19-plugin-deck-mobile-design.md`

## Global Constraints

- Work ONLY in this worktree: `/Users/burdon/Code/dxos/dxos/.claude/worktrees/plugin-deck-mobile-support-2ae1dd`, branch `claude/plugin-deck-mobile-support-2ae1dd`. Never create/switch branches or worktrees.
- No casts to silence the type-checker (`as any`, `as unknown as T`, non-null `!`). `as const` is fine.
- Workspace deps: in-repo `@dxos/*` packages use `"workspace:*"` in dependencies, `"workspace:^"` in peerDependencies. Never catalog for in-repo packages.
- No compatibility re-exports or shims when moving code — update every call site in the same change.
- Comments state _why_ in one clause, end with a period. Never narrate history ("moved from plugin-simple-layout" is banned).
- Run `pnpm format` (oxfmt, from repo root) and stage the result before every commit.
- Commit messages: `scope: description` + trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Before each commit: `git status` — include the user's own concurrent edits in the commit; never ask, never exclude, never mention them.
- Build/test via moon: `moon run plugin-deck:build`, `moon run plugin-deck:test -- <file>`, `moon run composer-app:build`.
- The Storybook server on :9009 belongs to the user — never kill it. Reuse (`curl -sf http://localhost:9009 >/dev/null`) or start your own on another port.
- Prerequisite context: PR #12644 may land on `main` mid-implementation (a land session is running). Task 8 has two paths depending on whether it has landed. The PR head is fetched locally as ref `pr-12644` (oid `81e39a2d45`).

---

### Task 1: Baseline — browser-mobile boot on the existing SimpleLayout path

No code changes. Establishes the regression baseline cheaply before touching anything.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server with mobile detection forced**

`DX_MOBILE` is read from the app config env (`main.tsx:366`), which the dev server surfaces from the process env. From `packages/apps/composer-app`:

Use the Browser pane (`preview_start` with a launch.json entry), adding to `.claude/launch.json` at repo root if not present:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "composer-mobile",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": [
        "--dir",
        "packages/apps/composer-app",
        "exec",
        "vite",
        "dev",
        "--configLoader",
        "native",
        "--port",
        "5199"
      ],
      "port": 5199
    }
  ]
}
```

Note: `DX_MOBILE=1` must reach the vite process. If launch.json cannot carry env, run instead in Bash background: `cd packages/apps/composer-app && DX_MOBILE=1 pnpm exec vite dev --configLoader native --port 5199`, then `preview_start` with `{url: "http://localhost:5199"}`.

- [ ] **Step 2: Verify SimpleLayout renders**

Resize the browser pane to the mobile preset (375×812), reload. Expected: the Home screen (searchable list of spaces/workspaces), an AppBar. Use `read_page` to confirm; screenshot for the record. Check `read_console_messages` for errors.

- [ ] **Step 3: Verify navigation**

Click a workspace tile → NavBranch list of its items. Open an item → article renders, back chevron appears. Record what works/breaks — this is the parity checklist for Task 10.

- [ ] **Step 4: Record baseline in a scratch note**

Write findings (boot OK/failures, navigation OK, console errors) to the scratchpad; they feed Task 13's parity verification. No commit (no repo changes).

### Task 2: Baseline — iOS simulator build on the existing path

Answers "does the iOS build boot at all today". Failure here does NOT block Tasks 3–13 (browser-mobile is the development harness); it changes only how Task 14 starts.

**Files:** none (verification only).

- [ ] **Step 1: Build the frontend bundle**

```bash
cd packages/apps/composer-app && pnpm exec vite build --configLoader native
```

Expected: `out/composer` populated (this is `frontendDist` in `src-tauri/tauri.conf.json`).

- [ ] **Step 2: Build the iOS app for simulator**

```bash
cd packages/apps/composer-app && ./scripts/ios-build.sh --debug --sim
```

This runs `tauri ios init --ci`, installs the KeyboardHandler plugin (`ios-init.sh`), and builds `aarch64-sim`. Takes many minutes (Rust + Xcode). Expected artifacts per the script's step 6.

- [ ] **Step 3: Boot a simulator and attach the live panel**

Use the iOS Simulator tools: boot a booted device if needed (`xcrun simctl boot "iPhone 16"` or latest available; `xcrun simctl list devices available`), then `attach` (mcp Claude_Code_iOS_Simulator control) BEFORE launching so the user can watch. Find the built .app under `src-tauri/gen/apple/build/` (e.g. `find src-tauri/gen/apple -name "*.app" -path "*simulator*"`), then `launch` with its path.

- [ ] **Step 4: Verify boot + record**

Screenshot via the simulator tool. Expected: Composer boots to onboarding or Home. Exercise: spaces list → open a space → open an item; keyboard behaviour on an input. Record pass/fail details in the scratch note. If the build itself fails, capture the exact error, record it, and continue to Task 3 — report the failure in the final summary.

### Task 3: `plugin-deck` platform option + Platform capability + mobile layout mode

**Files:**

- Modify: `packages/plugins/plugin-deck/src/types/DeckCapabilities.ts`
- Modify: `packages/plugins/plugin-deck/src/DeckPlugin.ts`
- Modify: `packages/plugins/plugin-deck/src/plugin.ts`
- Modify: `packages/plugins/plugin-deck/src/capabilities/state.ts`
- Modify: `packages/sdk/app-toolkit/src/ui/hooks/useShowItem.ts`
- Modify: `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx`

**Interfaces:**

- Produces: `type Platform = 'mobile' | 'desktop'`; `type DeckPluginOptions = { platform?: Platform }`; capability `DeckCapabilities.Platform` (singleton of `Platform`); the `AppCapabilities.Layout` atom reports `mode: 'mobile'` when platform is mobile. Later tasks (5, 9, 10, 11) consume `DeckCapabilities.Platform` and `DeckPluginOptions`.

- [ ] **Step 1: Add the Platform capability and options type**

In `types/DeckCapabilities.ts` (this file already defines `State`, `EphemeralState`, `Settings` via `Capability.makeSingleton` — follow its exact idiom; read it first):

```ts
export type Platform = 'mobile' | 'desktop';

/** Options for {@link DeckPlugin}. */
export type DeckPluginOptions = {
  /** Which root layout the plugin renders; state and operations are shared. */
  platform?: Platform;
};

export const Platform = Capability.makeSingleton<Platform>()(`${meta.profile.key}.platform`);
```

(Type + const merge is fine; match how the file names existing capabilities.)

- [ ] **Step 2: Thread options through the plugin definition**

`src/plugin.ts`: change `Plugin.define(meta)` to `Plugin.define<DeckCapabilities.DeckPluginOptions>(meta)` (type-only import from `#types`). `src/DeckPlugin.ts`: change `Plugin.lazy(meta, ...)` to `Plugin.lazy<DeckCapabilities.DeckPluginOptions>(meta, ...)` with a type-only import (`import type { DeckPluginOptions } from '#types'` — check the `#types` import map exposes types without loading the body; it does, imports are static type-only). Re-export the type: `export type { DeckPluginOptions } from '#types';` so `plugin-defs.core.tsx` can reference it from `@dxos/plugin-deck/DeckPlugin`.

- [ ] **Step 3: Contribute Platform + mobile layout mode from the state module**

`capabilities/state.ts`: the module effect currently takes no props. Change to receive plugin options (the framework maps plugin options onto module props — see `plugin-simple-layout`'s `spotlight-dismiss.ts` for the receiving idiom):

```ts
export default Capability.makeModule(
  Effect.fnUntraced(function* ({ platform = 'desktop' }: DeckCapabilities.DeckPluginOptions = {}) {
```

In the layout atom, report the mobile identity so cross-plugin master-detail dispatch can branch on it:

```ts
mode: platform === 'mobile' ? 'mobile' : DeckSchema.getMode(deck, !!ephemeral.fullscreen),
```

Add to the returned contributions:

```ts
Capability.contribute(DeckCapabilities.Platform, platform),
```

- [ ] **Step 4: Teach the two `mode === 'simple'` consumers about `'mobile'`**

`packages/sdk/app-toolkit/src/ui/hooks/useShowItem.ts` — the `switch (layout.mode)`: change `case 'simple':` to `case 'simple': case 'mobile':` (the `'simple'` case is deleted in Task 12 when the plugin dies; both live during the transition). Update the JSDoc line to name `'mobile'`.
`packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:42` — `if (layout.mode === 'simple')` becomes `if (layout.mode === 'simple' || layout.mode === 'mobile')`.

- [ ] **Step 5: Build and verify types**

```bash
moon run plugin-deck:build && moon run app-toolkit:build && moon run plugin-magazine:build
```

Expected: green. `DeckPlugin.make()` has one call site (`plugin-defs.core.tsx:75`) — with `platform` optional it still compiles unchanged; confirm with `moon run composer-app:build` only if fast, else defer to Task 12's build.

- [ ] **Step 6: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-deck: add platform option, Platform capability, and mobile layout mode"
```

### Task 4: Stack-push projection in `layout.ts` (TDD)

**Files:**

- Modify: `packages/plugins/plugin-deck/src/layout.ts`
- Test: `packages/plugins/plugin-deck/src/layout.test.ts`

**Interfaces:**

- Produces: `pushSubjectsToStack(active: readonly string[], subjects: readonly string[]): string[]` — consumed by Task 5's Open handler.

- [ ] **Step 1: Write the failing tests**

Append to `layout.test.ts` (match the file's existing describe/it style — read it first):

```ts
describe('pushSubjectsToStack', () => {
  it('pushes a new subject onto the top of the stack', () => {
    expect(pushSubjectsToStack(['a', 'b'], ['c'])).toEqual(['a', 'b', 'c']);
  });

  it('moves an already-open subject to the top instead of duplicating it', () => {
    expect(pushSubjectsToStack(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c', 'b']);
  });

  it('pushes multiple subjects in order, last on top', () => {
    expect(pushSubjectsToStack(['a'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('is a no-op re-push when the subject is already on top', () => {
    expect(pushSubjectsToStack(['a', 'b'], ['b'])).toEqual(['a', 'b']);
  });

  it('pushes onto an empty stack', () => {
    expect(pushSubjectsToStack([], ['a'])).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
moon run plugin-deck:test -- src/layout.test.ts
```

Expected: FAIL — `pushSubjectsToStack` is not exported.

- [ ] **Step 3: Implement**

In `layout.ts`:

```ts
/**
 * Computes the next `active` list for a mobile {@link LayoutOperation.Open}: the list is a
 * navigation stack (top = last), so subjects are appended, and an already-open subject moves to
 * the top rather than duplicating — a stack can hold each panel only once.
 */
export const pushSubjectsToStack = (active: readonly string[], subjects: readonly string[]): string[] => {
  const next = active.filter((id) => !subjects.includes(id));
  next.push(...subjects);
  return next;
};
```

- [ ] **Step 4: Run to verify pass**

```bash
moon run plugin-deck:test -- src/layout.test.ts
```

Expected: all PASS (existing tests too).

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-deck: add pushSubjectsToStack mobile projection"
```

### Task 5: Mobile semantics in the operation handlers

**Files:**

- Modify: `packages/plugins/plugin-deck/src/operations/open.ts`
- Modify: `packages/plugins/plugin-deck/src/operations/switch-workspace.ts`
- Modify: `packages/plugins/plugin-deck/src/operations/update-complementary.ts`

**Interfaces:**

- Consumes: `DeckCapabilities.Platform` (Task 3), `pushSubjectsToStack` (Task 4).
- Produces: on mobile, `Open` pushes (never solo-navigates), `SwitchWorkspace` does not auto-open the first child, and `UpdateComplementary` honors an explicit `input.state` even when `subject` is set. Tasks 9/10 rely on all three.

- [ ] **Step 1: Open handler — push on mobile**

In `open.ts`, read the platform once near the top (beside the existing `Capability.get(AppCapabilities.AppGraph)`):

```ts
const platform =
  yield * Capability.get(DeckCapabilities.Platform).pipe(Effect.catch(() => Effect.succeed('desktop' as const)));
```

(The catch keeps unit/story harnesses that activate the handler without the state module working; match the file's existing `Effect.catch` idiom at line ~37.)

Then in the disposition block (after `const deck = yield* DeckCapabilities.getDeck();` and the `disposition`/`seeded`/`levelOpen` computations), make mobile bypass the desktop disposition matrix — a stack has exactly one open semantic:

```ts
let next: string[];
if (platform === 'mobile') {
  // A stack has one open semantic: push (or surface) the subjects; solo-replace, pivots, and
  // seeded side-by-side planks are deck-geometry concepts with no stack analog.
  next = pushSubjectsToStack(deck.active, input.subject);
} else if (levelOpen) {
  ...existing chain unchanged...
```

- [ ] **Step 2: SwitchWorkspace — no auto-open on mobile**

In `switch-workspace.ts`, same platform read (with the same `Effect.catch` fallback). Guard the empty-deck auto-open (the `else` branch invoking `LayoutOperation.Open` on `openableChildren[0]`):

```ts
} else if (platform !== 'mobile') {
  // Mobile lands on the workspace's own list panel; auto-opening the first child would skip it.
  const [item] = openableChildren(graph, input.subject);
  ...
```

- [ ] **Step 3: UpdateComplementary — explicit state wins**

In `update-complementary.ts`, change:

```ts
const next = input.subject ? 'expanded' : (input.state ?? state.complementarySidebarState);
```

to:

```ts
const next = input.state ?? (input.subject ? 'expanded' : state.complementarySidebarState);
```

Verify no desktop caller regresses: `grep -rn "UpdateComplementary" packages --include="*.ts*" | grep -v test` and inspect each call site — callers passing `subject` + `state` currently pass `state: 'expanded'` (useShowItem, SubscriptionsArticle, plugin-support FeedbackPanel/Sidebar buttons), so behavior is unchanged for them; callers passing only `subject` still expand. Record the audit result in the commit message body if any caller needed a change.

- [ ] **Step 4: Build + tests**

```bash
moon run plugin-deck:build && moon run plugin-deck:test
```

Expected: green (the ops have no direct unit tests; the projection logic was tested in Task 4).

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-deck: mobile open/switch-workspace/complementary semantics"
```

### Task 6: Move `MobileLayout`, `DebugOverlay`, `Loading` into plugin-deck

**Files:**

- Move: `packages/plugins/plugin-simple-layout/src/components/{MobileLayout,DebugOverlay,Loading}/` → `packages/plugins/plugin-deck/src/components/`
- Modify: `packages/plugins/plugin-deck/src/components/index.ts`
- Modify: `packages/plugins/plugin-deck/package.json` (add `@dxos/react-ui-search` — needed in Task 7's Home/NavBranch, added here with the dep pass)

**Interfaces:**

- Produces: `MobileLayout.Root` / `MobileLayout.Panel` (props unchanged: `MobileLayoutRootProps { transition?, onKeyboardOpenChange? }`, `MobileLayoutPanelProps { safe? }`), `useMobileLayout(consumerName): { keyboardOpen: boolean }` from `MobileLayoutContext`, `Loading`, `DebugOverlay.Root`. Consumed by Tasks 9–11.

- [ ] **Step 1: Move the directories**

```bash
git mv packages/plugins/plugin-simple-layout/src/components/MobileLayout packages/plugins/plugin-deck/src/components/MobileLayout
git mv packages/plugins/plugin-simple-layout/src/components/DebugOverlay packages/plugins/plugin-deck/src/components/DebugOverlay
git mv packages/plugins/plugin-simple-layout/src/components/Loading packages/plugins/plugin-deck/src/components/Loading
```

- [ ] **Step 2: Fix imports and exports**

- Add the three to `plugin-deck/src/components/index.ts` (`export * from './MobileLayout';` etc., alphabetical).
- Remove them from `plugin-simple-layout/src/components/index.ts`.
- In the moved files: any `#meta` / `#hooks` imports now resolve to plugin-deck's maps — check each moved file's imports compile against plugin-deck (MobileLayout.tsx imports `../DebugOverlay` — path unchanged). Update the story title in `MobileLayout.stories.tsx` to `'plugins/plugin-deck/components/MobileLayout'`.
- `plugin-simple-layout` still consumes them (SimpleLayout.tsx, Main.tsx, AppBar.tsx, useDrawerActions.ts import `../MobileLayout/...`, `../DebugOverlay`, `../Loading`, and `#components` exports `useMobileLayout`): point those imports at `@dxos/plugin-deck` temporarily — add `"@dxos/plugin-deck": "workspace:*"` to `plugin-simple-layout/package.json` dependencies, and export `MobileLayout`, `useMobileLayout`, `Loading`, `DebugOverlay` from plugin-deck's public `src/index.ts` (they are being consumed cross-package until Task 12 deletes the consumer; the export from the main entry is the non-shim way to do that — no re-export files inside simple-layout).

- [ ] **Step 3: Add the search dependency to plugin-deck**

```bash
pnpm add --filter "@dxos/plugin-deck" "@dxos/react-ui-search@workspace:*"
```

Verify the entry landed as `"workspace:*"` in dependencies (not catalog).

- [ ] **Step 4: Build both packages**

```bash
moon run plugin-deck:build && moon run plugin-simple-layout:build
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-deck: absorb MobileLayout, DebugOverlay, Loading from plugin-simple-layout"
```

### Task 7: Move `Home`, `NavBranch`, `useExpandPath` into plugin-deck

**Files:**

- Move: `packages/plugins/plugin-simple-layout/src/components/{Home,NavBranch}/` → `packages/plugins/plugin-deck/src/components/`
- Create: `packages/plugins/plugin-deck/src/components/hooks.ts` (moved `useExpandPath`)
- Modify: `packages/plugins/plugin-deck/src/translations.ts`

**Interfaces:**

- Produces: `Home` (no props), `NavBranch({ id })`, `useExpandPath(nodeId?)`. Consumed by Tasks 10 (Main panel) and 11 (surfaces).

- [ ] **Step 1: Move**

```bash
git mv packages/plugins/plugin-simple-layout/src/components/Home packages/plugins/plugin-deck/src/components/Home
git mv packages/plugins/plugin-simple-layout/src/components/NavBranch packages/plugins/plugin-deck/src/components/NavBranch
git mv packages/plugins/plugin-simple-layout/src/components/hooks.ts packages/plugins/plugin-deck/src/components/hooks.ts
```

- [ ] **Step 2: Re-point meta + translations**

Both components import `meta` from `#meta` (now plugin-deck's) and translate with `useTranslation(meta.profile.key)` — the keys they use must exist under deck's translation namespace. Diff `plugin-simple-layout/src/translations.ts` against `plugin-deck/src/translations.ts` and copy every key the moved components (and, ahead of Tasks 9–10, `AppBar`/`NavBar`/drawer hooks) reference: at minimum `back.label`, `done.label`, `actions-menu.label`, `main-menu.label`, `expand-drawer.label`, `collapse-drawer.label` plus whatever `Home.tsx`/`NavBranch.tsx` use — enumerate with `grep -n "t('" <moved files>`. Copy them into deck's translations under deck's ns.

- [ ] **Step 3: Update exports + interim consumers**

Add `Home`, `NavBranch` to plugin-deck `components/index.ts` and remove from simple-layout's; simple-layout's `react-surface.ts` imports `Home, NavBranch` from `#components` — change to `from '@dxos/plugin-deck'` (interim, dies in Task 12). Simple-layout's `Main.tsx`/`Home` imports of `../hooks` (`useExpandPath`) likewise.
Rename the testid `simpleLayoutPlugin.addSpace` in whatever moved file carries it (only `useNavbarActions.ts` — not moved yet; note for Task 9).

- [ ] **Step 4: Build both + commit**

```bash
moon run plugin-deck:build && moon run plugin-simple-layout:build
pnpm format && git add -A && git commit -m "plugin-deck: absorb Home, NavBranch, useExpandPath"
```

### Task 8: NavigationStack into plugin-deck

**Files:**

- Create: `packages/plugins/plugin-deck/src/components/NavigationStack/NavigationStack.tsx`
- Create: `packages/plugins/plugin-deck/src/components/NavigationStack/index.ts`

**Interfaces:**

- Produces: `NavigationStack({ classNames, items, index, onIndexChange, renderItem })` — `items: string[]` root-first, `index` = top of stack, `onIndexChange(index)` fired when an interactive pop completes, `renderItem(id, index) => ReactNode`. Consumed by Task 10.

- [ ] **Step 1: Determine the source**

```bash
git fetch origin main:refs/remotes/origin/main 2>/dev/null; git log origin/main --oneline -- packages/plugins/plugin-simple-layout/src/components/NavigationStack | head -1
```

- If PR #12644 has landed (the log shows a commit): `git merge origin/main` first (resolve conflicts; the overlap with this branch should be nil-to-small), then `git mv` the NavigationStack directory from simple-layout into `plugin-deck/src/components/`.
- If not landed: extract from the fetched PR head:

```bash
mkdir -p packages/plugins/plugin-deck/src/components/NavigationStack
git show pr-12644:packages/plugins/plugin-simple-layout/src/components/NavigationStack/NavigationStack.tsx > packages/plugins/plugin-deck/src/components/NavigationStack/NavigationStack.tsx
git show pr-12644:packages/plugins/plugin-simple-layout/src/components/NavigationStack/index.ts > packages/plugins/plugin-deck/src/components/NavigationStack/index.ts
```

Note in the commit body: `NavigationStack authored in #12644 (denjell-crabnebula); moved here for the unified layout plugin.`

- [ ] **Step 2: Wire exports + verify imports**

Add to `components/index.ts`. The component imports only `@dxos/react-ui` (`ThemedClassName`, `useMediaQuery`) and `@dxos/ui-theme` (`mx`) — both already deck deps. If the PR head version imports anything else, add the dep per the workspace rule.
Also check the PR head for `vite-env.d.ts` additions the component needs (`git show pr-12644:packages/plugins/plugin-simple-layout/src/vite-env.d.ts`) and mirror into plugin-deck's `vite-env.d.ts` if required.
Note: #12644 ships no NavigationStack story — interactive coverage comes from Task 10's `MobileDeckLayout` story and Task 13's runtime checks; do not invent a standalone story here.

- [ ] **Step 3: Build + commit**

```bash
moon run plugin-deck:build
pnpm format && git add -A && git commit -m "plugin-deck: add NavigationStack (from #12644)"
```

### Task 9: Mobile hooks in plugin-deck (stack projection, app bar, navbar, drawer)

**Files:**

- Create: `packages/plugins/plugin-deck/src/hooks/useMobileStack.ts`
- Create: `packages/plugins/plugin-deck/src/hooks/useMobileAppBar.ts`
- Create: `packages/plugins/plugin-deck/src/hooks/useMobileActions.ts` (navbar + drawer actions + shared companion-action builder)
- Modify: `packages/plugins/plugin-deck/src/hooks/index.ts`

These are ports of `plugin-simple-layout/src/hooks/{useAppBarProps,useNavbarActions,useDrawerActions,actions}.ts` rewritten against deck state. Read those four originals side-by-side while porting — the atom-derivation structure (build an `Atom.make((get) => ActionGraphProps)`, return `{ actions, onAction: useActionRunner() }`) carries over verbatim; only the state reads/writes change per the mapping table below.

**State mapping (used by all three hooks):**

| simple-layout                                    | deck                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `state.active` (single id)                       | top of stack: `deck.active[deck.active.length - 1]`                                                                                   |
| `state.workspace`                                | `state.activeDeck`, with `DeckSchema.DEFAULT_DECK_ID` treated as `Node.RootId`                                                        |
| `state.history`                                  | `deck.active.slice(0, -1)`                                                                                                            |
| `state.drawerState` `'closed'/'open'/'expanded'` | `state.complementarySidebarState` `'closed'/'collapsed'/'expanded'` — but drawer is only open when `complementarySidebarPanel` is set |
| `state.companionVariant`                         | `state.complementarySidebarPanel`                                                                                                     |
| drawer state writes                              | `updateState` on `DeckCapabilities.State` (direct atom write, same package)                                                           |

**Interfaces:**

- Consumes: `useDeckState()` (existing), `DeckCapabilities.State` atom, `useMobileLayout` (Task 6), `PLANK_COMPANION_TYPE` (already exported from `#types` `DeckSchema`).
- Produces:
  - `useMobileStack(): { stack: string[]; topId: string; rootId: string; pop: () => void }` — `rootId = activeDeck === DEFAULT_DECK_ID ? Node.RootId : activeDeck`; `stack = [rootId, ...deck.active]`; `topId = stack[stack.length - 1]`; `pop()` invokes `LayoutOperation.Close { subject: [deck.active[deck.active.length - 1]] }` when active is non-empty, else invokes `LayoutOperation.SwitchWorkspace { subject: Node.RootId }` when `rootId !== Node.RootId`.
  - `useMobileAppBar(): { title, actions, showBackButton, popoverAnchorId, onBack, onAction }` (same shape as old `AppBarProps` minus classNames).
  - `useMobileNavbarActions(): { actions, onAction }` and `useMobileDrawerActions(consumerName): { actions, onAction }`.

- [ ] **Step 1: `useMobileStack`**

```ts
//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as Node from '@dxos/app-graph/Node';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';

import { DeckSchema } from '#types';

import { useDeckState } from './useDeckState';

export type MobileStack = {
  /** Panel ids, root (workspace list panel) first; the visible panel is last. */
  stack: string[];
  /** The visible panel. */
  topId: string;
  /** The stack's root panel: the workspace, or the app root when no workspace is active. */
  rootId: string;
  /** Navigate back: close the top panel, or return to the workspace list from a workspace root. */
  pop: () => void;
};

/**
 * Projects the active deck as a mobile navigation stack: `active` is the stack (top = last), the
 * workspace itself is the root panel beneath it, so back is Close until the stack is empty and
 * SwitchWorkspace(root) from there — the same operations every other surface uses.
 */
export const useMobileStack = (): MobileStack => {
  const { state, deck } = useDeckState();
  const { invokePromise } = useOperationInvoker();

  const rootId = state.activeDeck === DeckSchema.DEFAULT_DECK_ID ? Node.RootId : state.activeDeck;
  const stack = useMemo(() => [rootId, ...deck.active], [rootId, deck.active]);
  const topId = stack[stack.length - 1] ?? rootId;

  const pop = useCallback(() => {
    const top = deck.active[deck.active.length - 1];
    if (top) {
      void invokePromise(LayoutOperation.Close, { subject: [top] });
    } else if (rootId !== Node.RootId) {
      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: Node.RootId });
    }
  }, [invokePromise, deck.active, rootId]);

  return { stack, topId, rootId, pop };
};
```

Check `LayoutOperation.Close`'s input schema (`subject: string[]`) and `deck close.ts` before finalizing; adjust field names to the real schema.

- [ ] **Step 2: `useMobileAppBar`**

Port `useAppBarProps.ts` with the mapping table: `activeId` := `useMobileStack().topId`; the actions atom derives `activeId` inside `Atom.make` from the deck State atom (`get(stateAtom)` → `state.decks[state.activeDeck]` top entry, falling back to the root id — mirror the projection inline since hooks can't run in atoms); back logic := `useMobileStack().pop` with `showBackButton = stack.length > 1 || rootId !== Node.RootId`; `popoverAnchorId` reads `EphemeralState` atom's `popoverAnchorId` with the same `${meta.profile.key}:${node.id}` guard. Keep the disposition filter list (`'list-item'`, `'list-item-primary'`, `'heading-list-item'`) identical.

- [ ] **Step 3: `useMobileActions`** (companion builder + navbar + drawer)

Port `actions.ts` `createCompanionActions` (drop its local `PLANK_COMPANION_TYPE` — import `DeckSchema.PLANK_COMPANION_TYPE` from `#types`) and both hooks, with drawer writes mapped:

- companion tab tap: toggling — if `complementarySidebarPanel === variant && complementarySidebarState !== 'closed'` → write `{ complementarySidebarPanel: undefined, complementarySidebarState: 'closed' }`, else `{ complementarySidebarPanel: variant, complementarySidebarState: 'collapsed' }` (collapsed = half-open drawer on mobile).
- expand toggle: `'expanded'` ↔ `'collapsed'`.
- close: `{ complementarySidebarPanel: undefined, complementarySidebarState: 'closed' }`.
- All writes via `useDeckState().updateState` (persisted atom).
- Rename testid `simpleLayoutPlugin.addSpace` → `deckPlugin.addSpace`.
- Keep the `keyboardOpen` gating from `useDrawerActions` (uses `useMobileLayout(consumerName)`).

- [ ] **Step 4: Build**

```bash
moon run plugin-deck:build
```

Expected: green. (These hooks are exercised in Task 10's story and Task 13's runtime check; they have no isolated unit tests — the reactive-atom pattern is storybook-verified in this codebase.)

- [ ] **Step 5: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-deck: mobile stack/app-bar/drawer hooks over deck state"
```

### Task 10: `MobileDeckLayout` container + AppBar/NavBar/Drawer/Main + story

**Files:**

- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/MobileDeckLayout.tsx`
- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/MobileAppBar.tsx` (move+rename of simple-layout `AppBar.tsx`)
- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/MobileNavBar.tsx` (move+rename of `NavBar.tsx`)
- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/MobileDrawer.tsx` (port of `Drawer.tsx`)
- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/MobileMain.tsx` (port of PR-12644 `Main.tsx`)
- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/MobileDeckLayout.stories.tsx`
- Create: `packages/plugins/plugin-deck/src/containers/MobileLayout/index.ts`
- Modify: `packages/plugins/plugin-deck/src/containers/index.ts`

**Interfaces:**

- Consumes: `MobileLayout.Root/Panel`, `NavigationStack`, `Home`/`NavBranch` (via surfaces, not direct imports), `useMobileStack`/`useMobileAppBar`/`useMobileNavbarActions`/`useMobileDrawerActions`, deck's `Dialog`, `PopoverRoot`/`PopoverContent`, `Toaster` from `../DeckLayout` — import these three from `../DeckLayout` directly (export them from `containers/DeckLayout` index if not already).
- Produces: `MobileDeckLayout({ onDismissToast })` — same props contract as `DeckLayout`. Consumed by Task 11's react-root.

- [ ] **Step 1: Move AppBar/NavBar**

```bash
git mv packages/plugins/plugin-simple-layout/src/components/SimpleLayout/AppBar.tsx packages/plugins/plugin-deck/src/containers/MobileLayout/MobileAppBar.tsx
git mv packages/plugins/plugin-simple-layout/src/components/SimpleLayout/NavBar.tsx packages/plugins/plugin-deck/src/containers/MobileLayout/MobileNavBar.tsx
```

Rename the components/display names `SimpleLayout.AppBar` → `MobileDeckLayout.AppBar`, `SimpleLayout.NavBar` → `MobileDeckLayout.NavBar`; fix the `useMobileLayout` import path (`../../components/MobileLayout/MobileLayoutContext` → via `#components` barrel) and `#meta`. Move their stories alongside (`AppBar.stories.tsx`, `NavBar.stories.tsx`) with retitled story paths, or fold into the layout story in Step 5 — prefer moving them, retitled `plugins/plugin-deck/containers/MobileLayout/...`.

- [ ] **Step 2: `MobileDrawer`**

Port `Drawer.tsx` against deck state: companion selection reads `state.complementarySidebarPanel` (was `companionVariant`), companions come from the existing deck hook `useCompanions(topId)` (plugin-deck already has `hooks/useCompanions.ts` — read it; if its signature differs from simple-layout's, adapt the call, do not duplicate the hook), actions from `useMobileDrawerActions('MobileDeckLayout.Drawer')`. Structure (Panel.Root → Toolbar of tabs → Surface of the selected companion with `companionTo`) carries over unchanged. `useSelectedCompanion` — plugin-deck already exports one from `hooks/useSelectedCompanion.ts`; reuse it if compatible, else inline the simple-layout selection logic (selected = panel matching `Attention.getLinkedVariant`, fallback first companion).

- [ ] **Step 3: `MobileMain`**

Port PR-12644's `Main.tsx` (source: `git show pr-12644:packages/plugins/plugin-simple-layout/src/components/SimpleLayout/Main.tsx`, or the merged file if #12644 landed):

- `MainPanel` subcomponent unchanged (per-panel node resolution + `Surface` of `AppSurface.Article`, `limit={1}`, `Loading` placeholder, `ErrorFallback`).
- `const { stack, topId, pop } = useMobileStack();` replaces the history computation; `<NavigationStack items={stack} index={stack.length - 1} onIndexChange={pop} ...>`.
- App bar props from `useMobileAppBar()`; navbar from `useMobileNavbarActions()`.
- `showNavBar = !keyboardOpen && drawerClosed` where `drawerClosed = state.complementarySidebarState === 'closed' || !state.complementarySidebarPanel` (the old `state.isPopover` clause dies — deck never renders this in a popover window).
- `useAttentionAttributes(topId)`, `useExpandPath(topId)` as in the original.
- `popoverAnchorId` from ephemeral state.

- [ ] **Step 4: `MobileDeckLayout`**

Port `SimpleLayout.tsx` structure with the drawer mapping and deck chrome:

```tsx
export const MobileDeckLayout = ({ onDismissToast }: DeckLayoutProps) => {
  const { state } = useDeckState();
  const { toasts } = state;
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [splitterMode, setSplitterMode] = useState<SplitterMode>('start');
  const drawerRef = useRef<HTMLDivElement>(null);

  // Splitter follows the drawer state only while the keyboard is closed; the keyboard handler
  // owns the mode while open (restored on close), matching the plugin-simple-layout behavior.
  const drawerOpen = !!state.complementarySidebarPanel && state.complementarySidebarState !== 'closed';
  useLayoutEffect(() => {
    if (!keyboardOpen) {
      setSplitterMode(!drawerOpen ? 'start' : state.complementarySidebarState === 'expanded' ? 'end' : 'split');
    }
  }, [drawerOpen, state.complementarySidebarState, keyboardOpen]);

  return (
    <DebugOverlay.Root enabled={false}>
      <PopoverRoot>
        <Dnd.Root>
          <MobileLayout.Root
            classNames='dx-container grid relative dx-toolbar-surface'
            onKeyboardOpenChange={setKeyboardOpen}
          >
            <MobileLayout.Panel safe={{ top: true, bottom: splitterMode === 'start' }}>
              <Splitter.Root orientation='vertical' mode={splitterMode} size={24}>
                <Splitter.Panel position='start'>
                  <MobileMain />
                </Splitter.Panel>
                <Splitter.Panel position='end' ref={drawerRef}>
                  <MobileDrawer />
                </Splitter.Panel>
              </Splitter.Root>
              <Dialog />
              <PopoverContent />
              <Toaster toasts={toasts} onDismissToast={onDismissToast} />
            </MobileLayout.Panel>
          </MobileLayout.Root>
        </Dnd.Root>
      </PopoverRoot>
    </DebugOverlay.Root>
  );
};
```

(Exact imports: `Dialog`, `PopoverRoot`, `PopoverContent`, `Toaster` from `../DeckLayout`; adjust `containers/DeckLayout/index.ts` to export them if it doesn't.)

- [ ] **Step 5: Story**

`MobileDeckLayout.stories.tsx`: reuse the `WithKeyboard` iOS-keyboard simulator from the moved `MobileLayout.stories.tsx` (export it from that story file or lift it into a shared testing helper within the package). The story needs the deck plugin's state capabilities — mirror how `DeckLayout.stories.tsx` (379 lines) sets up its harness (read it; it already builds a plugin-manager/story environment for deck state). Story title `plugins/plugin-deck/containers/MobileDeckLayout`. Render the layout with a couple of fake graph nodes if the DeckLayout story harness provides them; otherwise render with empty state (Home surface won't resolve in the story — acceptable; the story's purpose is chrome + keyboard + splitter behaviour).

- [ ] **Step 6: Build + storybook smoke**

```bash
moon run plugin-deck:build
```

Then verify the story renders: reuse the user's storybook on :9009 if it serves plugin-deck stories (`curl -sf http://localhost:9009 >/dev/null`), else `moon run storybook-react:serve -- --port 9010` and open `http://localhost:9010/?path=/story/plugins-plugin-deck-containers-mobiledecklayout--default` in the Browser pane. Screenshot; check console for errors. Exercise the story's keyboard toggle (focus the input) and splitter.

- [ ] **Step 7: Commit**

```bash
pnpm format && git add -A && git commit -m "plugin-deck: MobileDeckLayout container (stack + drawer + keyboard chrome)"
```

### Task 11: Branch react-root; register mobile surfaces

**Files:**

- Modify: `packages/plugins/plugin-deck/src/capabilities/react-root.tsx`
- Modify: `packages/plugins/plugin-deck/src/capabilities/react-surface.ts`

**Interfaces:**

- Consumes: `DeckPluginOptions` (module props), `MobileDeckLayout` (Task 10), `Home`/`NavBranch` (Task 7).
- Produces: mobile Composer renders `MobileDeckLayout`; `Home` on `attendableId === Node.RootId`, `NavBranch` on workspace/branch nodes (mobile only).

- [ ] **Step 1: react-root branches on platform**

The module effect receives options (same idiom as Task 3 Step 3). Inside `root`, keep the existing `handleDismissToast` and render:

```tsx
return platform === 'mobile' ? (
  <MobileDeckLayout onDismissToast={handleDismissToast} />
) : (
  <DeckLayout onDismissToast={handleDismissToast} />
);
```

(`platform` is captured by the module closure — the `root` component itself doesn't need the capability.)

- [ ] **Step 2: react-surface registers mobile surfaces**

Give the module effect the same options param. Append, only when `platform === 'mobile'`, the two surfaces from simple-layout's `react-surface.ts` (its `notFound` surface already exists in deck — skip it):

```ts
...(platform === 'mobile'
  ? [
      Surface.create({
        id: 'home',
        filter: Surface.makeFilter(AppSurface.Article, (data) => data.attendableId === Node.RootId),
        component: Home,
      }),
      Surface.create({
        id: 'navBranch',
        position: Position.last,
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data) =>
            ['workspace', 'user-account', 'pin-end'].includes(data.properties?.disposition) ||
            data.properties?.role === 'branch',
        ),
        component: NavBranch,
        props: ({ data: { attendableId } }) => ({ id: attendableId }),
      }),
    ]
  : []),
```

(Copy the `ALLOWED_DISPOSITIONS` const + imports from the simple-layout original.)

- [ ] **Step 3: Build + commit**

```bash
moon run plugin-deck:build
pnpm format && git add -A && git commit -m "plugin-deck: platform-branched react root and mobile surfaces"
```

### Task 12: Composer wiring — plugin set, layout selection; delete plugin-simple-layout

**Files:**

- Modify: `packages/apps/composer-app/src/plugin-defs.core.tsx`
- Create: `packages/apps/composer-app/src/plugin-defs.mobile.tsx`
- Modify: `packages/apps/composer-app/vite.config.ts`
- Modify: `packages/apps/composer-app/package.json`
- Modify: `packages/sdk/app-toolkit/src/ui/hooks/useShowItem.ts` (drop `'simple'`)
- Modify: `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx` (drop `'simple'`)
- Delete: `packages/plugins/plugin-simple-layout/` (entire package)

**Interfaces:**

- Consumes: `DeckPluginOptions` re-export (Task 3), all moved components/hooks.
- Produces: `DX_PLUGIN_SET=mobile` builds the mobile registry; mobile/desktop both run on DeckPlugin.

- [ ] **Step 1: Layout selection**

`plugin-defs.core.tsx:75` becomes:

```ts
const layoutPlugin = isPopover
  ? SpotlightPlugin.make()
  : DeckPlugin.make({ platform: isMobile ? 'mobile' : 'desktop' });
```

Remove the `SimpleLayoutPlugin` import and any other reference in the file (grep the whole `src/` for `simple-layout`/`SimpleLayout`).

- [ ] **Step 2: `plugin-defs.mobile.tsx`**

Modelled on `plugin-defs.minimal.tsx` (same exports: `getDefaults`, `getPlugins`, re-export `PluginConfig`/`State`):

```tsx
//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/** Plugin keys enabled by default for new users of the mobile set. */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
  TranscriptionPlugin.meta.profile.key,
];

/**
 * Mobile plugin registry (opt-in via DX_PLUGIN_SET=mobile): core infrastructure + Assistant
 * (Chat/ChatThread), Markdown (chat content rendering), and Transcription (voice input).
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins(config),
  AssistantPlugin.make(),
  MarkdownPlugin.make(),
  TranscriptionPlugin.make(),
];
```

Match the real `make()` signatures from `plugin-defs.tsx` (Assistant/Markdown/Transcription are all called bare there — verify at write time).

- [ ] **Step 3: vite.config plugin-set generalization**

Replace the boolean with a lookup:

```ts
const pluginSets: Record<string, string> = {
  minimal: 'src/plugin-defs.minimal.tsx',
  mobile: 'src/plugin-defs.mobile.tsx',
};
const pluginSetFile = pluginSets[process.env.DX_PLUGIN_SET ?? ''] ?? 'src/plugin-defs.tsx';
const isReducedPluginSet = pluginSetFile !== 'src/plugin-defs.tsx';
```

Rename the two `isMinimalPluginSet` uses (`optimizeDeps.include` gate and the alias) and the `minimalPluginEntries()` entries gate to `isReducedPluginSet` (the entries helper already reads `pluginSetFile`, so it generalizes as-is — update its comment and name to `reducedPluginEntries`).

- [ ] **Step 4: Delete the package**

```bash
git rm -r packages/plugins/plugin-simple-layout
```

Remove `"@dxos/plugin-simple-layout": "workspace:*"` from `packages/apps/composer-app/package.json`. Then sweep:

```bash
grep -rn "simple-layout\|SimpleLayout\|simpleLayout" packages tools .github docs --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yml" --include="*.md" | grep -v node_modules
```

Fix every hit (including the interim `@dxos/plugin-deck` imports created in Tasks 6–7 — they die with the package; also any persisted-state key or i18n ns references). Drop `'simple'` from `useShowItem.ts` (`case 'mobile':` only, update JSDoc) and `SubscriptionsArticle.tsx` (`=== 'mobile'`). Remove the plugin-deck `src/index.ts` exports added in Task 6 Step 2 ONLY if nothing else imports them (the containers use `#components` internally — keep public exports minimal; check with grep).

```bash
pnpm install
```

(refresh the lockfile for the removed package).

- [ ] **Step 5: Build the world**

```bash
moon run plugin-deck:build && moon run app-toolkit:build && moon run plugin-magazine:build && moon run composer-app:build
pnpm knip
```

Expected: green; knip reports no new unused deps/files (pre-existing findings are out of scope — compare against `git stash`-free main run only if it flags plugin-deck/composer-app).

- [ ] **Step 6: Commit**

```bash
pnpm format && git add -A && git commit -m "composer-app: single deck layout plugin; add mobile plugin set; retire plugin-simple-layout"
```

### Task 13: Runtime verification — browser-mobile parity + desktop regression

**Files:** none (verification; fix-forward edits allowed and committed as found).

- [ ] **Step 1: Mobile run, full registry**

`DX_MOBILE=1 pnpm exec vite dev --configLoader native --port 5199` (as Task 1), Browser pane at mobile preset. Verify against the Task 1 baseline: Home spaces list renders (deck root, `activeDeck === 'default'` → Home surface); tapping a space runs SwitchWorkspace → NavBranch list (NO auto-opened first item); opening an item pushes a panel with slide animation; back chevron pops; left-edge swipe pops (pointer-drag from x<20 via `computer` drag); companion tab opens the bottom drawer at half height; expand/close drawer buttons work; dialog+popover (e.g. rename popover) render. Console clean.

- [ ] **Step 2: Mobile run, mobile registry**

Restart the dev server with both flags: `DX_MOBILE=1 DX_PLUGIN_SET=mobile pnpm exec vite dev --configLoader native --port 5199`. Verify boot, spaces list, create/open a Chat (Assistant plugin), ChatThread renders, keyboard-open drawer behaviour on the chat prompt. If Chat companions require ThreadPlugin (symptom: chat renders but thread companion surface unresolved), add `ThreadPlugin.make()` + its default key to `plugin-defs.mobile.tsx`, commit as `composer-app: mobile set needs thread plugin`.

- [ ] **Step 3: Desktop regression**

Plain `pnpm exec vite dev --configLoader native --port 5199` (no flags), desktop preset. Verify: deck renders planks side-by-side, open/close/companion/complementary sidebar behave, no console errors. Also `moon run plugin-deck:test` once more.

- [ ] **Step 4: Commit any fixes**

Each fix gets a normal scoped commit. Then update the story baseline note in the scratchpad.

### Task 14: iOS simulator — mobile plugin set end-to-end

**Files:** none (verification), possibly `packages/apps/composer-app/scripts/ios-build.sh` if a plugin-set flag is worth adding (only if needed — YAGNI otherwise; env on the vite step suffices).

- [ ] **Step 1: Build the mobile frontend**

```bash
cd packages/apps/composer-app && DX_PLUGIN_SET=mobile pnpm exec vite build --configLoader native
```

- [ ] **Step 2: Build + install the simulator app**

```bash
cd packages/apps/composer-app && ./scripts/ios-build.sh --debug --sim --skip-clean
```

(`--skip-clean` if Task 2 already generated the Xcode project and #12644's native changes haven't landed since; if #12644 WAS merged in Task 8, run without `--skip-clean` so `ios-init.sh` installs the microphone bridge.)

- [ ] **Step 3: Attach + launch + verify**

Attach the simulator panel first, launch the app, then verify on-device: boot → identity/onboarding → Home spaces list → space → Chat → ChatThread; keyboard opens without layout shift (MobileLayout.Root's kb handling); drawer splitter under keyboard; edge-swipe back; voice input smoke test IF #12644's mic bridge is in the build (tap the mic affordance in the chat prompt; expect permission prompt, not a crash — full transcription needs a provider and may be config-gated; record what happens).

- [ ] **Step 4: Record results**

Screenshots at each step via the simulator tool; note failures honestly. Anything broken that is in scope gets fixed and re-verified; anything out of scope (e.g. transcription provider config) gets listed in the PR body as a known follow-up.

### Task 15: Changeset, project ledger, PR

**Files:**

- Create: `.changeset/<generated-name>.md`
- Modify: project `TASKS.md` if a `/dxos:project` entry exists for this stream (check `.agents/projects/registry.yml`; if none, skip — do not create one unprompted).

- [ ] **Step 1: Changeset**

Per `agents/instructions/changesets.md` (read it): consumer-relevant, pre-1.0 → minor. Name the packages actually changed for consumers:

```md
---
'@dxos/plugin-deck': minor
'@dxos/app-toolkit': patch
---

plugin-deck renders mobile natively (navigation stack + drawer over deck state); plugin-simple-layout is retired.
```

Verify `@dxos/plugin-simple-layout` removal needs no changeset entry of its own (a deleted package cannot be bumped; mention it in the deck entry's text as above). Check whether `@dxos/plugin-magazine` and composer-app need entries per the instructions file's rules.

- [ ] **Step 2: Final sweep**

```bash
git status
moon run :lint -- --fix  # scoped: at minimum plugin-deck, composer-app, app-toolkit, plugin-magazine
pnpm format
git add -A && git commit -m "chore: changeset and lint for deck mobile support"  # only if changes exist
```

Account for every modified/untracked file, including the user's own edits — commit them.

- [ ] **Step 3: PR via the submit-pr skill**

Invoke the `submit-pr` skill (it owns sync-with-main, CI monitoring, and the Composer preview URL). PR title: `plugin-deck: mobile support (navigation stack), retire plugin-simple-layout`. Body: spec link, #12644 relationship, iOS verification results incl. screenshots, known follow-ups. If #12644 has not yet landed, state the ordering dependency prominently in the PR body.

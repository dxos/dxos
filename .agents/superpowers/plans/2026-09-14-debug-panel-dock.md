# Docked DebugPanel (deck bottom drawer) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The debug panel docks as a bottom drawer of the deck's main area — planks reflow above it — with a float/dock toggle, docked by default at 24rem.

**Architecture:** `@dxos/react-ui`'s `Main` gains a `Drawer` part whose open state and height live in `Main.Root`'s context, mirrored onto `Main.Content` as `data-drawer-state` + `--main-drawer-height` so the existing padding mechanism reflows content. plugin-deck persists `drawerState`/`drawerHeight` in its stored state, handles `LayoutOperation.UpdateDrawer`, and renders `Main.Drawer` hosting a `Surface` of role `AppSurface.Drawer`. plugin-debug contributes its panel to that surface, keeps the floating window for `mode: 'floating'`, and toggles between them from the status bar and the panels' title bars.

**Tech Stack:** react-ui `Main`/`Panel`/`Toolbar`/`Splitter`/`FloatingPanel`, ui-theme CSS layers, effect `Schema`, `@dxos/compute/Operation`, deck KVS state atom, react-ui-attention `ViewState`, storybook + vitest.

**Spec:** `packages/plugins/plugin-debug/docs/DESIGN.md` §5 (default mode **docked**, default height **24rem**).

## Global Constraints

- Branch `claude/plugin-higgsfield-generation-7ee65d`, worktree `.claude/worktrees/session-url-binding-error-7c6458`; commits `scope: description` + `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`; `pnpm oxfmt <files>` before each commit; `git status` and include the user's uncommitted edits.
- No casts (`as any`, `as unknown as`, non-null `!`); comments say _why_ in one clause, never history; no wrapper divs in containers; react-ui composables only; workspace deps `workspace:*`; import order builtin → external → @dxos → internal → parent → sibling; `.ts`/`.tsx` extensions on relative imports; new-file headers `// Copyright 2026 DXOS.org`.
- Persisted-state compatibility: every new field on `DeckSchema.StoredDeckState` and `DebugPanelViewState` is **optional** (a required field makes existing persisted state fail decoding and fall back to defaults, wiping the user's decks). Absent means closed / 24rem / docked.
- The drawer is chrome: never in the URL, never a plank, never takes deck attention. Fullscreen hides it like the sidebars.
- Do not add a plugin-debug → plugin-deck dependency: the role and operation live in `@dxos/app-toolkit`.
- Tests: `pnpm --filter <pkg> exec vitest run --project=node <file>` / `--project=storybook`; typecheck `npx tsc --noEmit -p <pkg>/tsconfig.json`; lint `moon run <pkg>:lint`. No `moon run <pkg>:build` while the storybook (9009) and Composer (5180) servers are up; both serve this worktree.

---

### Task 1: `Main.Drawer` in react-ui

**Files:**

- Modify: `packages/ui/react-ui/src/components/Main/MainContext.ts` (context value)
- Modify: `packages/ui/react-ui/src/components/Main/Main.tsx` (Root props, Content attrs, new `MainDrawer`, export)
- Modify: `packages/ui/react-ui/src/components/Main/Main.theme.ts` (`drawer`, `drawerHandle`)
- Modify: `packages/ui/ui-theme/src/css/layout/main.css` (`.dx-main-drawer`, `.dx-main-drawer-handle`, content block-end padding)
- Modify: `packages/ui/react-ui/src/components/Main/Main.stories.tsx` (drawer story + play)

**Interfaces:**

- Produces:

```ts
export type DrawerState = 'open' | 'closed';
// MainContextValue additions
drawerState: DrawerState;
setDrawerState: Dispatch<SetStateAction<DrawerState | undefined>>;
/** Height in rem. */
drawerHeight: number;
setDrawerHeight: Dispatch<SetStateAction<number | undefined>>;
// MainRootProps additions
drawerState?: DrawerState; defaultDrawerState?: DrawerState; onDrawerStateChange?: (next: DrawerState) => void;
drawerHeight?: number; defaultDrawerHeight?: number /* 24 */; onDrawerHeightChange?: (next: number) => void;
/** Fired when a resize drag ends: the moment to persist. */
onDrawerHeightChangeEnd?: (next: number) => void;
// Main.Drawer
type MainDrawerProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & { label: Label; minHeight?: number /* 8 */; maxHeight?: number /* 64 */ };
export const DRAWER_DEFAULT_HEIGHT = 24;
```

- `Main.Content` renders `data-drawer-state={drawerState}` and `style={{ '--main-drawer-height': drawerState === 'open' ? `${drawerHeight}rem` : '0rem' }}` merged with the caller's `style`.

- [ ] **Step 1: Context + Root**

In `MainContext.ts` add `DrawerState`, the four fields to `MainContextValue`, and defaults (`'closed'`, `24`, warn-only setters like the sidebars). In `Main.tsx` `MainRoot`: two more `useControllableState`s (`drawerState` default `'closed'`, `drawerHeight` default `defaultDrawerHeight`), pass them into `MainProvider`. Keep an `onDrawerHeightChangeEnd` ref in the provider value (add `onDrawerHeightChangeEnd?: (next: number) => void` to the context) so the drawer's handle can call it on pointer-up.

- [ ] **Step 2: Content**

In `MainContent` read `drawerState`, `drawerHeight` from context; add `data-drawer-state={drawerState}` and merge `'--main-drawer-height'` into `style` (`{ ...props.style, '--main-drawer-height': … }`, typed through `CSSProperties & Record<'--main-drawer-height', string>` — no cast). In `main.css` inside `.dx-main-content-padding` add:

```css
padding-block-end: var(--main-drawer-height, 0rem);
scroll-padding-block-end: var(--main-drawer-height, 0rem);
```

and add `padding-block-end` to `.dx-main-content-padding-transitions`' `transition-property`.

- [ ] **Step 3: Drawer**

```tsx
const MAIN_DRAWER_NAME = 'Main.Drawer';

/**
 * A bottom drawer across the main area, between the sidebars: `Main.Content` pads block-end by its
 * height so content reflows above it rather than being covered. Closed, it is not in the DOM.
 */
const MainDrawer = forwardRef<HTMLDivElement, MainDrawerProps>(
  ({ classNames, children, label, minHeight = 8, maxHeight = 64, ...props }, forwardedRef) => {
    const { t } = useTranslation(osTranslations);
    const { tx } = useThemeContext();
    const {
      drawerState,
      drawerHeight,
      setDrawerHeight,
      onDrawerHeightChangeEnd,
      navigationSidebarState,
      complementarySidebarState,
    } = useMainContext(MAIN_DRAWER_NAME);
    const { ref: moverRef, ...mover } = useLandmarkMover(props.onKeyDown, '3');

    // Pointer drag on the top edge: rem = px / root font size, clamped; persisted on release.
    const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
    const handlePointerDown = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        dragRef.current = { startY: event.clientY, startHeight: drawerHeight };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      [drawerHeight],
    );
    const handlePointerMove = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragRef.current) return;
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const next = dragRef.current.startHeight + (dragRef.current.startY - event.clientY) / rem;
        setDrawerHeight(Math.min(maxHeight, Math.max(minHeight, next)));
      },
      [setDrawerHeight, minHeight, maxHeight],
    );
    const handlePointerUp = useCallback(
      (event: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragRef.current) return;
        dragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        onDrawerHeightChangeEnd?.(drawerHeight);
      },
      [drawerHeight, onDrawerHeightChangeEnd],
    );

    if (drawerState !== 'open') {
      return null;
    }

    return (
      <div
        {...mover}
        {...props}
        role='region'
        aria-label={toLocalizedString(label, t)}
        data-state={drawerState}
        data-sidebar-left-state={navigationSidebarState}
        data-sidebar-right-state={complementarySidebarState}
        className={tx('main.drawer', {}, classNames)}
        style={{ ...props.style, blockSize: `${drawerHeight}rem` }}
        ref={useComposedRefs<HTMLDivElement>(forwardedRef, moverRef)}
      >
        <button
          type='button'
          aria-label={t('drawer resize label')}
          className={tx('main.drawerHandle', {})}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
        {children}
      </div>
    );
  },
);
```

Add `'drawer resize label': 'Resize drawer'` to `osTranslations` (`packages/ui/ui-theme/src/translations.ts` — check where `osTranslations` keys live and follow that file). Theme:

```ts
const drawer: ComponentFunction<MainStyleProps> = (_, ...etc) =>
  mx('dx-main-drawer', 'dx-focus-ring-inset-over-all', ...etc);
const drawerHandle: ComponentFunction<MainStyleProps> = (_, ...etc) => mx('dx-main-drawer-handle', ...etc);
```

CSS (in the `dx-components` layer of `main.css`):

```css
/** Bottom drawer: fixed to the block-end edge between the sidebars; the content pads for it. */
.dx-main-drawer {
  @apply fixed grid grid-rows-[min-content_1fr] border-t border-separator overflow-hidden;
  --surface-bg: var(--dx-surface-chrome);
  background-color: var(--surface-bg);
  inset-block-end: env(safe-area-inset-bottom);
  inset-inline-start: 0;
  inset-inline-end: 0;
  z-index: 6;
  transition-property: inset-inline-start, inset-inline-end;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.6, 1);

  @media (width >= theme(--breakpoint-lg)) {
    &[data-sidebar-left-state='collapsed'] {
      inset-inline-start: var(--dx-l0-size);
    }
    &[data-sidebar-left-state='expanded'] {
      inset-inline-start: var(--dx-nav-sidebar-size);
    }
    &[data-sidebar-right-state='collapsed'] {
      inset-inline-end: var(--dx-r0-size);
    }
    &[data-sidebar-right-state='expanded'] {
      inset-inline-end: var(--dx-complementary-sidebar-size);
    }
  }
}

.dx-main-drawer-handle {
  @apply block-size-1 cursor-row-resize bg-transparent hover:bg-accent-surface;
  touch-action: none;
}
```

(Use the same `--dx-r0-size` / `--dx-complementary-sidebar-size` names `.dx-main-content-padding` uses for the right sidebar — copy them from there.) Export `Drawer: MainDrawer` from the `Main` object and `DrawerState`, `DRAWER_DEFAULT_HEIGHT`, `MainDrawerProps` types; `useMainContext` already exports.

- [ ] **Step 4: Story + play**

Add to `Main.stories.tsx` a `Drawer` story: `Main.Root` with `defaultDrawerState='open'`, `Main.Content` holding a tall block, `Main.Drawer label='Drawer'` with text `Drawer content`. Play: assert the region is present, `getComputedStyle(content).paddingBlockEnd === '384px'` (24rem at 16px), then click a "Close" button rendered in the story (calls `setDrawerState('closed')` via `useMainContext`) and assert the region is gone and padding is `0px`.

- [ ] **Step 5: Verify**

`npx tsc --noEmit -p packages/ui/react-ui/tsconfig.json`, `moon run react-ui:lint ui-theme:lint`, `pnpm --filter @dxos/react-ui exec vitest run --project=storybook src/components/Main/Main.stories.tsx`.

- [ ] **Step 6: Commit** — `react-ui: Main.Drawer, a bottom drawer the main content reflows around`.

---

### Task 2: `AppSurface.Drawer` role and `LayoutOperation.UpdateDrawer`

**Files:**

- Modify: `packages/sdk/app-toolkit/src/ui/components/app-surface.ts` (role)
- Modify: `packages/sdk/app-toolkit/src/operations/LayoutOperation.ts` (operation)
- Test: `packages/sdk/app-toolkit/src/operations/LayoutOperation.test.ts` (extend if it exists, else create a minimal schema test)

**Interfaces:**

- Produces:

```ts
// app-surface.ts, beside StatusIndicator
/** The deck's bottom drawer; one contributor renders at a time. */
export const Drawer: Role.Role<Record<string, unknown>> = Role.make('org.dxos.role.drawer');
// LayoutOperation.ts, beside UpdateSidebar
export const UpdateDrawer = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.updateDrawer'),
    name: 'Update Drawer',
    description: 'Open, close or resize the bottom drawer.',
    icon: 'ph--rows--regular',
  },
  executionMode: 'sync',
  services: [Capability.Service],
  input: Schema.Struct({
    state: Schema.optional(
      Schema.Literals(['open', 'closed', 'toggle']).annotate({ description: 'Open, close, or toggle the drawer.' }),
    ),
    height: Schema.optional(Schema.Number.annotate({ description: 'Drawer height in rem.' })),
  }),
  output: Schema.Void,
});
```

- [ ] Steps: add both (mirror `UpdateSidebar`'s shape exactly, including `Operation.make` options), typecheck app-toolkit, run its existing tests for the touched files, commit `app-toolkit: AppSurface.Drawer role and LayoutOperation.UpdateDrawer`.

---

### Task 3: plugin-deck persists and renders the drawer

**Files:**

- Modify: `packages/plugins/plugin-deck/src/types/DeckSchema.ts` (`StoredDeckState`)
- Modify: `packages/plugins/plugin-deck/src/capabilities/state.ts` (defaults)
- Create: `packages/plugins/plugin-deck/src/operations/update-drawer.ts`
- Modify: `packages/plugins/plugin-deck/src/operations/index.ts` (register)
- Test: `packages/plugins/plugin-deck/src/operations/update-drawer.test.ts` (create; model on any existing operation test in the package, else on `plugin-projects/src/operations/*.test.ts`)
- Modify: `packages/plugins/plugin-deck/src/containers/Deck/DeckContent.tsx` (render `Main.Drawer`)
- Modify: `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx` if its state literal needs the new optional fields (it should not — they are optional)

**Interfaces:**

- Consumes: Task 1 `Main.Drawer`/Root props; Task 2 `UpdateDrawer`, `AppSurface.Drawer`.
- Produces: `StoredDeckState.drawerState?: 'open' | 'closed'`, `StoredDeckState.drawerHeight?: number`; handler semantics: `state: 'toggle'` flips, `'open'|'closed'` sets, `height` sets (clamped 8–64); no-op when nothing changes.

- [ ] **Step 1: Failing handler test** — build the handler through the package's test harness (find how `update-sidebar`/other deck ops are tested; if none, use `createComposerTestApp({ plugins: [DeckPlugin.make(...)] })` from `@dxos/plugin-testing/harness` and `invokePromise`), assert: toggle from absent → `'open'`; `height: 30` → `drawerHeight === 30`; `state: 'closed'` → closed; `height: 100` → 64.
- [ ] **Step 2: Schema + defaults** — add the two optional fields; `defaultDeckState` leaves them undefined.
- [ ] **Step 3: Handler** — mirror `update-sidebar.ts`; register in `operations/index.ts` beside `UpdateSidebar`.
- [ ] **Step 4: DeckContent** — pass `drawerState={fullscreen ? 'closed' : (state.drawerState ?? 'closed')}`, `drawerHeight={state.drawerHeight ?? DRAWER_DEFAULT_HEIGHT}`, `onDrawerStateChange` → `updateState(drawerState)`, `onDrawerHeightChangeEnd` → `updateState(drawerHeight)` to `Main.Root`; render after `<ComplementarySidebar …/>`:

```tsx
<Main.Drawer label={t('drawer.label')}>
  <Surface.Surface type={AppSurface.Drawer} limit={1} />
</Main.Drawer>
```

`t` via `useTranslation(meta.profile.key)`; add `'drawer.label': 'Drawer'` to plugin-deck translations. `Main.Drawer` returns `null` when closed, so the surface is not resolved while closed.

- [ ] **Step 5: Verify** — handler test green, `tsc` on plugin-deck, `moon run plugin-deck:lint`, `pnpm --filter @dxos/plugin-deck exec vitest run --project=storybook src/containers/Deck` (unchanged counts vs. a baseline run taken first).
- [ ] **Step 6: Commit** — `plugin-deck: bottom drawer state, UpdateDrawer, and the AppSurface.Drawer host`.

---

### Task 4: plugin-debug docks by default, floats on request

**Files:**

- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanel/view-state.ts` (`mode`)
- Create: `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelHeader.tsx` (shared title-bar controls: dock/float toggle + close; used by both hosts)
- Create: `packages/plugins/plugin-debug/src/containers/DebugPanelDrawer/DebugPanelDrawer.tsx` + `index.ts` + `DebugPanelDrawer.stories.tsx`
- Modify: `packages/plugins/plugin-debug/src/containers/DebugPanelStatus/DebugPanelStatus.tsx` (mode-aware trigger; dock control in the floating header)
- Modify: `packages/plugins/plugin-debug/src/containers/index.ts`, `src/capabilities/react-surface.ts` (drawer surface), `src/capabilities/index.ts` (declare the role), `src/translations.ts` (`'dock-panel.label': 'Dock panel'`, `'float-panel.label': 'Float panel'`, `'close-panel.label': 'Close'`)

**Interfaces:**

- Consumes: `AppSurface.Drawer`, `LayoutOperation.UpdateDrawer` (Task 2); `DebugPanel.Root/Sidebar/Main`, `useDebugPanelContext`.
- Produces: `DebugPanelViewState.mode?: 'floating' | 'docked'` (absent = docked); `DebugPanelHeader` props `{ mode, onModeChange, onClose }`; `DebugPanelDrawer` (the surface component: `Panel.Root` → `Panel.Toolbar` with `DebugPanelHeader` → `Splitter` with Sidebar/Main, inside `DebugPanel.Root`).

- [ ] **Step 1: View state** — add `mode: Schema.optional(Schema.Literals(['floating', 'docked']))` (absent → docked); expose `mode` + `setMode` on the panel context (`DebugPanel.Root`).
- [ ] **Step 2: Header** — a `Toolbar.Root` fragment (`MenuBuilder`/`useMenuActions` per the toolbar rule if it grows beyond two icon buttons; two `Toolbar.IconButton`s are acceptable here): float/dock toggle (`ph--arrow-square-out--regular` / `ph--arrow-square-in--regular`) and close. In the floating host the close is `FloatingPanel.CloseTrigger`; in the drawer it invokes `LayoutOperation.UpdateDrawer({ state: 'closed' })`.
- [ ] **Step 3: Drawer container** — `DebugPanelDrawer`: `DebugPanel.Root` → `Panel.Root` → `Panel.Toolbar` (title `t('debug-panel.title')` + header controls) → `Panel.Content` with the same `Splitter.Root … Sidebar / Main` as `DebugPanelStatus`. Register `Surface.create({ id: 'debugDrawer', filter: Surface.makeFilter(AppSurface.Drawer), component: DebugPanelDrawer })`; add `'org.dxos.role.drawer'` to the surface module's `roles`.
- [ ] **Step 4: Status trigger** — `DebugPanelStatus` reads `mode`: docked → the `IconButton` invokes `UpdateDrawer({ state: 'toggle' })` and is not a `FloatingPanel.Trigger`; floating → unchanged. Switching mode from a header: docked → floating = `UpdateDrawer({ state: 'closed' })` then set mode and open the floating panel (`FloatingPanel.Root` `open` controlled by a local state the status component owns); floating → docked = close the floating panel, set mode, `UpdateDrawer({ state: 'open' })`.
- [ ] **Step 5: Stories** — `DebugPanelDrawer.stories.tsx` renders `Main.Root defaultDrawerState='open'` + `Main.Content` + `Main.Drawer` hosting `DebugPanelDrawer` with the stub tools plugin from `src/testing/`; play: Console selected by default, click Logs, click the float control → assert the `mode` in view state becomes `'floating'` (read via `useViewState` in a probe or through localStorage key `dxos:view-state:debug-panel:<contextId>`).
- [ ] **Step 6: Verify** — `tsc` + `moon run plugin-debug:lint`, `vitest --project=storybook src/containers/DebugPanel src/containers/DebugPanelDrawer src/containers/DebugPanelStatus`.
- [ ] **Step 7: Commit** — `plugin-debug: the panel docks as the deck's bottom drawer; float on request`.

---

### Task 5: Composer verification, docs, ledger, PR

- [ ] Composer (5180): status-bar button opens the drawer at 24rem with the tree + console; planks reflow (a plank's article bottom edge sits above the drawer — check `getComputedStyle(main).paddingBlockEnd`); drag the handle → height persists across reload; float control → floating window with the same selection; dock control → back in the drawer; fullscreen (`Deck` fullscreen action) hides it; sidebar collapse/expand moves the drawer's inline edges. Screenshots to `temp/`.
- [ ] `plugin-debug/PLUGIN.mdl` (panel hosts, mode), `plugin-deck/PLUGIN.mdl` (drawer slot), `react-ui` docs if `Main` is documented; tick Phase 3 in `.agents/projects/plugin-debug/TASKS.md`; registry `resume`.
- [ ] Commit `plugin-debug, plugin-deck: docs for the docked panel; ledger`; push; append a "Docked drawer" section to PR #13095's body via `gh pr edit --body-file`.

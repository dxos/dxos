# `@dxos/react-ui-stack` — Refactor Audit

Snapshot of every package that depends on `@dxos/react-ui-stack`, what it actually imports, and how heavily. Use this as the baseline for the refactor: it identifies the real API surface in use, the dead weight, and the highest-risk consumers.

## Migration progress

Deprecating `@dxos/react-ui-stack` in favour of `@dxos/react-ui-mosaic`'s `Stack` + `react-ui` `Panel`/`Toolbar` + `AttentionSigil`.
Tracking below; time is wall-clock (accurate), tokens are cumulative totals computed from the session transcript — `in` = uncached input, `out` = output, `total` = all categories incl. cache read/write. NOTE: the transcript file flushes intermittently (not per-turn), so token figures lag real-time and update in steps; treat them as approximate. Baseline `T0 = 2026-06-23 02:35 EDT`, recorded as stage 0 below.

| #   | Task                                                           | Status      | Completed (elapsed) | Tokens (in / out / total) |
| --- | -------------------------------------------------------------- | ----------- | ------------------- | ------------------------- |
| 0   | Planning: audit, research, design decisions                    | done        | T0 (baseline)       | 78K / 131K / 21.6M        |
| 1   | plugin-navtree: Panel story + local rearrange type, drop dep   | ✅ done      | 02:45 (+10m)        | 78K / 131K / 21.6M (lag)  |
| 2   | plugin-script: NotebookArticle → Mosaic.Stack                  | pending     | —                   | —                         |
| 3   | StackItemSigil → AttentionSigil in `app-toolkit/ui/components` | pending     | —                   | —                         |
| 4   | plugin-stack: Mosaic.Stack + new Tile + StackArticle story     | pending     | —                   | —                         |
| 5   | plugin-deck: AUDIT mapping + migrate Plank to Mosaic/Tile      | pending     | —                   | —                         |
| 6   | plugin-deck: companion column-stack option                     | pending     | —                   | —                         |

Decisions (locked): Tile built in plugin-stack first, extracted later · AttentionSigil lives in `app-toolkit/ui/components` (keeps react-ui-attention free of `@dxos/app-graph`) · plugin-stack rebuilt + storybook only, re-wiring deferred · per-task commits, no push without request.

## Public API surface (current)

Three entrypoints are published (`package.json#exports`):

| Entrypoint       | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.` (root)       | `Stack`, `StackProps`, `Orientation`, `Size`, `railGridHorizontal`, `railGridVertical`, `StackContext`, `StackContextValue`, `useStack`, `StackItemContext`, `useStackItem`, `ItemDragState`, `idle`, `StackItem` namespace (`Root`, `Content`, `DragHandle`, `DragPreview`, `Heading`, `HeadingLabel`, `HeadingStickyContent`, `ResizeHandle`, `Sigil`, `SigilButton`), `StackItem*Props`, `StackItemSigilAction`, `StackItemSize`, `StackItemData`, `StackItemRearrangeHandler`, `DEFAULT_VERTICAL_SIZE`, `DEFAULT_HORIZONTAL_SIZE`, `DEFAULT_EXTRINSIC_SIZE` |
| `./translations` | `translations` (i18n resources)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `./playwright`   | `StackManager` (e2e page-object helper)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

> Note: `useStackDropForElements` (`src/components/Stack/useStackDropForElements.ts`) and `useKeyDown` (`src/components/Stack/useKeyDown.ts`) are **not** exported from the package root. They are internal — consumed only by `Stack.tsx`.

> The published export surface is unchanged by the in-progress refactor (same symbols at the same three entrypoints); the refactor is an **internal reorganization** — see "Internal structure" below.

## Internal structure (post-refactor)

The refactor in flight reorganizes `src/components` without changing the public surface:

```
components/
  index.ts                        // barrels Stack, StackContext, StackItem (+ type * from ./types)
  types.ts                        // Orientation, Size, StackItemSize, StackItemData,
                                  //   StackItemRearrangeHandler, StackContextValue  (consolidated here)
  Stack/
    Stack.tsx                     // Stack, StackProps, railGridHorizontal/Vertical
    useStackDropForElements.ts    // internal (moved from old top-level hooks/)
    useKeyDown.ts                 // internal (new)
  StackContext/
    StackContext.ts               // StackContext, useStack, StackItemContext, useStackItem, ItemDragState, idle
  StackItem/
    StackItem.tsx                 // StackItem namespace + DEFAULT_*_SIZE; re-imports Sigil bits
    StackItemContent.tsx · StackItemDragHandle.tsx · StackItemHeading.tsx · StackItemResizeHandle.tsx
  StackItemSigil/
    StackItemSigil.tsx            // StackItemSigil, StackItemSigilButton, StackItemSigilAction
    MenuSignifier.tsx             // moved here
```

Key moves vs. the previous layout:

- `Orientation` / `Size` types: `Stack/Stack.tsx` → `types.ts`.
- `StackContextValue`: de-duplicated (was defined in both `types.ts` and `StackContext.tsx`) → single definition in `types.ts`.
- Context: `components/StackContext.tsx` → `components/StackContext/StackContext.ts`.
- Hooks: top-level `src/hooks/` removed; `useStackDropForElements` → `Stack/`; new internal `Stack/useKeyDown.ts`.
- Sigil: `StackItem/StackItemSigil.tsx` + `StackItem/MenuSignifier.tsx` → dedicated `StackItemSigil/` module.

## Consumers

| Package          | Entrypoint(s)         | Symbols used                                                                                                                                                                                                          | Intensity           | Notes                                                                                                                                                          |
| ---------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `composer-app`   | `./playwright`        | `StackManager`                                                                                                                                                                                                        | **Playwright only** | e2e page object.                                                                                                                                               |
| `app-framework`  | `./playwright` (ref)  | —                                                                                                                                                                                                                     | **Infra**           | `vite-plugin/import-map` whitelists the `playwright` subpath; not a code consumer.                                                                             |
| `plugin-deck`    | `.`, `./translations` | `Stack`, `StackContext` (Provider), `StackItem` (`Root`, `Heading`, `HeadingLabel`, `ResizeHandle`, `Sigil`, `SigilButton`), `StackItemSize`, `StackItemSigilAction`, `railGridHorizontal`, `DEFAULT_HORIZONTAL_SIZE` | **Heavy**           | Deepest integration. Drives Plank/Deck layout via `StackContext.Provider`, sigil actions, resize handles. Highest-risk consumer.                               |
| `plugin-stack`   | `.`, `./translations` | `Stack`, `StackItem` (`Root`, `Content`, `Heading`, `HeadingStickyContent`, `SigilButton`), `StackItemSize`                                                                                                           | **Heavy**           | Core stack UI. Has its **own** `StackContext`/`useStack` (in `src/components/StackContext`) — distinct from react-ui-stack's; do not conflate during refactor. |
| `plugin-script`  | `.`                   | `Stack`, `StackItem` (`Root`, `Content`, `DragHandle`, `DragPreview`, `Heading`, `ResizeHandle`), `StackProps`                                                                                                        | **Medium**          | `NotebookStack` renders a full `<Stack>` with DnD (drag handle + preview).                                                                                     |
| `plugin-navtree` | `.`                   | `Stack`, `StackItem` (`Root`, `Content`, `ResizeHandle`), `StackItemRearrangeHandler` (type)                                                                                                                          | **Medium**          | `L0Menu` uses the rearrange-handler type; `<Stack>` rendered in story only.                                                                                    |

## Observations for the refactor

1. **Two real component consumers** carry almost all the weight: `plugin-deck` and `plugin-stack`. Any breaking change to `Stack` / `StackItem.*` / `StackContext` should be validated against these first.
2. **`StackItem` is the hot surface.** Most-used subcomponents across consumers: `Root`, `Content`, `Heading`, `ResizeHandle`. `DragHandle`/`DragPreview` are `plugin-script`-only; `Sigil`/`SigilButton`/`HeadingLabel` are largely `plugin-deck`-driven; `HeadingStickyContent` is `plugin-stack`-only.
3. **`./translations` is no longer an independent surface.** Its only remaining consumers are `plugin-deck` and `plugin-stack` — both already heavy component consumers (the three former translations-only stories merges, `plugin-board` / `plugin-pipeline` / `react-ui-board`, were dropped). It could be folded back into the root export, or kept separate purely for tree-shaking.
4. **`./playwright` is independent infra** (composer-app e2e + app-framework import-map). Decouple from any component-API churn.
5. **Naming collision risk:** `plugin-stack` defines its own `StackContext`/`useStack`. Renaming react-ui-stack's context exports would reduce ambiguity.
6. **Internal-only hooks:** `useStackDropForElements` and `useKeyDown` (both in `Stack/`) are unexported and used solely by `Stack` itself — safe to refactor without external impact.
7. **10 packages decoupled** (this refactor), all dropped from `package.json` + `tsconfig.json`:
   - 6 stale deps with zero imports: `plugin-explorer`, `plugin-registry`, `react-ui-canvas-compute`, `react-ui-graph`, `react-ui-masonry`, `react-ui-table`.
   - `stories-assistant` — former light component consumer; consuming stories deleted.
   - `plugin-board`, `plugin-pipeline`, `react-ui-board` — former `./translations`-only consumers; the `stackTranslations` merge was removed from their stories.
8. **Public surface preserved:** the in-progress refactor is internal-only — no consumer imports need to change. Validate by typechecking `plugin-deck` + `plugin-stack`.

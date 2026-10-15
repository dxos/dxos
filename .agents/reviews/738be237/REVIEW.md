---
branch: claude/gracious-planck-8v2m0z
commit: 738be237b39a830c4a05fce52d22214a0af04d5e
base: 26f8347f93083445e8cb515ebc67743766b95e97
mode: pr-only
createdAt: 2026-09-28T02:42:47.418Z
isFinalized: true
groups: 57
rules: [consistent-field-and-list-ordering, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, extract-non-rendering-logic-from-component, keep-parallel-apis-structurally-aligned, name-for-general-behavior, no-styling-wrapper-divs]
reviewId: 738be237
---

_0 error(s), 11 warning(s)._

# WARN 738be237-1 extract-non-rendering-logic-from-component `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:436:3`

`ArtifactPreviewHost` opens and closes a `window` event-listener subscription (`DX_ANCHOR_ACTIVATE`) directly in an inline `useEffect`, mixing an open-on-mount/close-on-unmount resource lifecycle into a component whose job is otherwise to render the popover. Per `extract-non-rendering-logic-from-component`, hoist the subscribe/unsubscribe pair (and the `handleActivate` matching logic it wraps) into a small named hook, e.g. `useAnchorActivate(artifacts, onMatch)`, and have the component just call it.

# WARN 738be237-2 extract-non-rendering-logic-from-component `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:504:3`

`ArtifactsStory`'s `artifacts` value is computed with an inline `useMemo` that builds a dedup/flatten query over `tasks` (`flatMap` into refs, filter targets, `Set` dedup) directly in the component body — exactly the "building a filter/query" case `extract-non-rendering-logic-from-component` flags. Pull the computation out into a named helper function (e.g. `collectArtifacts(tasks): Obj.Unknown[]`) and call it from inside the `useMemo`, so the derivation logic isn't hidden inline in the render body.

# WARN 738be237-3 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:663:9`

`<div className='p-2'>` around `TaskList.Editor` (and the attached-files paragraph) exists only to carry padding, which `no-styling-wrapper-divs` flags directly. Replace it with `Container` (or `Flex` with `asChild`) projecting the `p-2` gap onto the wrapper instead of a hand-rolled div.

# WARN 738be237-4 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:697:5`

`<div className='grid grid-cols-[1fr_24rem] dx-fill divide-x divide-separator dx-base-surface'>` is a hand-rolled grid div. Use `Grid` with `cols={['1fr', '24rem']}` (the list form the rule calls out) in its place, keeping the surface/divider classes on the primitive via `classNames`.

# WARN 738be237-5 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:697:16`

`grid-cols-[1fr_24rem]` on the list/detail split wrapper is a bracketed arbitrary value for a fixed inline size that the design system already tokenizes — 24rem is exactly Tailwind's `96` step (`w-96` / `data-inline-size="96"`, defined in `packages/ui/ui-theme/src/css/layout/size.css`), and the same file already reaches for a semantic width token elsewhere (`dx-card-popover-width` a few lines up, for the artifact-preview popover). Per `design-tokens-not-raw-spacing-sizing`, swap the raw `24rem` for the matching semantic sizing token (e.g. a `grid-cols-[1fr_theme(width.96)]`/CSS-variable equivalent, or a dedicated `dx-*` detail-column-width class alongside `dx-card-popover-width`) instead of hardcoding the pixel-equivalent value.

# WARN 738be237-6 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:698:7`

`<div className='flex flex-col min-w-0 min-h-0' data-testid='story.list'>` is a hand-rolled flex column. Replace it with `Flex` (`column`) — which takes `asChild` so the `data-testid` can still land on the semantic element — instead of the raw div.

# WARN 738be237-7 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:712:7`

`<div className='flex flex-col overflow-y-auto' data-testid='story.detail'>` is another hand-rolled flex column (paired with the one above). Use `Flex` (`column`) with `asChild` to carry the `data-testid` and the scroll class, rather than a raw div.

# WARN 738be237-8 consistent-field-and-list-ordering `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:42:3`

`TaskStatusControlProps` orders its fields `classNames`, `active`, `task`, `onTaskUpdate`, putting the identifying `task` field third. Its sibling props types in the same file, `TaskOrdinalProps` and `TaskCheckboxProps` (and `TaskOrdinalProps`'s own field order was just corrected in this change to put `classNames` before `task`), both follow `classNames`, `task`, ...other data..., callback-last. Per `consistent-field-and-list-ordering`, reorder `TaskStatusControlProps` to `classNames`, `task`, `active`, `onTaskUpdate` to mirror the established sibling convention.

# WARN 738be237-9 keep-parallel-apis-structurally-aligned `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:48:1`

`TaskStatusControl` is one of four parallel row-cell controls in this file that each render an editable glyph and fall back to a static view when there is nothing to edit (`TaskStatusControl`, `TaskCheckbox`, `TaskEstimateControl`, `TaskPriorityIcon`). `TaskEstimateControl` (line 204) and `TaskPriorityIcon` (line 253) get their mutator by calling `useTaskListContext(...)` internally and check `if (!onTaskUpdate)` themselves, so a caller just passes `task`. `TaskStatusControl` instead declares `onTaskUpdate` as an explicit prop on `TaskStatusControlProps` (line 44) and both call sites already have the same value in scope from context and thread it through by hand: `TaskTreeNode.tsx:417` (`onTaskUpdate={onTaskUpdate}`) and `TaskListEditor.tsx:376`, right beside code (`TaskTreeTrailing` in `TaskList.tsx:527-528`) that renders `TaskEstimateControl`/`TaskPriorityIcon` with no such prop. Per `keep-parallel-apis-structurally-aligned`, give `TaskStatusControl` the same signature shape as its siblings — read `onTaskUpdate` from `useTaskListContext` inside the component and drop it from `TaskStatusControlProps` — so all four cells are called the same way instead of one requiring the caller to relearn how to wire it up.

# WARN 738be237-10 name-for-general-behavior `packages/ui/react-ui-task/src/components/TaskList/TaskRowCells.tsx:253:14`

`TaskPriorityIcon` is named after its original narrow case — a display-only glyph — but its own doc comment says "the glyph is also the control: it opens a menu to set the level," and the implementation does exactly that (an `ActionMenu` wrapping an `IconButton`) whenever `onTaskUpdate` is available. Its sibling `TaskStatusControl` (and `TaskEstimateControl`) went through the identical icon-or-menu evolution and were named `...Control` for it, while this one kept the stale `...Icon` name. Per `name-for-general-behavior`, rename it to `TaskPriorityControl` (and its exported type/displayName) to match its actual, general behavior and the convention its parallel components already follow.

# WARN 738be237-11 dont-leak-internal-api-through-public-surface `packages/ui/react-ui/src/hooks/useIconHref.ts:20:1`

`useIconHref` is re-exported through `hooks/index.ts` into `@dxos/react-ui`'s root `index.ts`, making it part of the package's public surface, but it has no caller outside the package: a repo-wide search finds only `Icon.tsx` and `Avatar.tsx`, both inside `react-ui` itself, using it. It also exposes an internal rendering-mechanism detail — how an icon name resolves to a same-document `<use href>` against the sprite/registry — that a consumer has no reason to reach for directly; anyone needing an icon uses the `Icon`/`Avatar` components, and the one cross-package consumer (`lit-ui`'s `dx-icon.ts`) talks to the registry singleton (`getIconRegistry()`) directly rather than this hook. Per `dont-leak-internal-api-through-public-surface`, drop it from `hooks/index.ts` (keep it a same-directory import for `Icon.tsx`/`Avatar.tsx`, as `icon-registry.ts` already is) so the package keeps the freedom to change this resolution mechanism later without it being someone else's public API.

# Card/Dialog Row Slots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `Card.Row`'s overloaded `icon` prop with explicit, symmetric start/end gutter slots (`Card.Block`) shared across `Column`, `Card`, and `Dialog`, and drop `Card.Header`'s toolbar role.

**Architecture:** `Column.Row` gains Panel-style `data-slot` grid routing (start→col 1, end→col 3, anonymous→content). A new `Column.Block` reuses the existing `IconBlock` rail-item geometry and adds placement. `Card`/`Dialog` theme it as `Card.Block`/`Dialog.Block`. `Card.Header` becomes a plain `<header>` sharing `Card.Row`'s layout (only icon-size differs: 5 vs 4). `Card.Row.icon`, `Card.Icon`, `Card.IconBlock` are removed; the standalone `IconBlock` primitive stays. All call sites migrate in batched per-package commits.

**Tech Stack:** React + `@radix-ui/react-slot` + `@radix-ui/react-primitive`, `tx()` theme functions (`@dxos/ui-theme`), `slottable()`/`composable()` utils, Storybook, vitest, moon.

Spec: `docs/superpowers/specs/2026-06-13-card-row-slots-design.md`

**Conventions:** package `@dxos/react-ui` at `packages/ui/react-ui`. Build: `moon run react-ui:build`. Lint: `moon run react-ui:lint -- --fix`. Storybook already runs on :9009 (reuse, never kill). Commit per task.

---

## Phase 1 — Column primitive

### Task 1: `data-slot` grid routing in `Column.Row` theme

**Files:**

- Modify: `packages/ui/react-ui/src/components/Column/Column.theme.ts:22-24` (the `row` fn)

- [ ] **Step 1: Update the `row` theme to route slots by `data-slot`**

Replace the `row` ComponentFunction body so children are placed by attribute, not order:

```ts
/**
 * Three-column subgrid row. Children are placed by `data-slot`:
 * - `start` → column 1 (leading gutter)
 * - `end`   → column 3 (trailing gutter)
 * - anything else (anonymous) → column 2 (center content)
 * Placement is attribute-driven, not order-driven, so conditional children never shift content.
 */
const row: ComponentFunction<ColumnStyleProps> = (_, ...etc) => {
  return mx(
    'col-span-3 grid grid-cols-subgrid',
    '[&>[data-slot=start]]:col-start-1',
    '[&>[data-slot=end]]:col-start-3',
    '[&>*:not([data-slot])]:col-start-2',
    ...etc,
  );
};
```

- [ ] **Step 2: Build to typecheck**

Run: `moon run react-ui:build`
Expected: PASS (no consumers broken yet — `Column.Row` was already used only by Card/Dialog rows that currently place via order; placement classes are additive).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui/src/components/Column/Column.theme.ts
git commit -m "feat(react-ui): route Column.Row children by data-slot"
```

### Task 2: Add `Column.Block`

**Files:**

- Modify: `packages/ui/react-ui/src/components/Column/Column.tsx` (add component + export)
- Modify: `packages/ui/react-ui/src/components/Column/Column.theme.ts` (add `block` style)

- [ ] **Step 1: Add a `block` style to `Column.theme.ts`**

Reuse the rail-item geometry (same classes as `icon.block` in `Icon.theme.ts`). Add after `center`:

```ts
/**
 * Gutter slot geometry: a `--dx-rail-item` square that centers its child, so a passive
 * `<Icon>` and an interactive `IconButton` line up to the pixel. Placement (col 1/3) is
 * applied by the parent `row` via `data-slot`.
 */
const block: ComponentFunction<ColumnBlockStyleProps> = ({ compact, square }, ...etc) =>
  mx(
    'grid place-items-center [&>img]:max-w-[1.5rem]',
    square ? 'aspect-square' : 'w-[var(--dx-rail-item)]',
    compact ? '' : 'h-[var(--dx-rail-item)]',
    ...etc,
  );
```

Add the style-props type near the top of the file and include `block` in the export:

```ts
export type ColumnStyleProps = {};
export type ColumnBlockStyleProps = { compact?: boolean; square?: boolean };
```

```ts
export const columnTheme = {
  root,
  row,
  block,
  bleed,
  center,
};
```

- [ ] **Step 2: Add `ColumnBlock` to `Column.tsx`**

Add after `ColumnCenter` (before the `Column` namespace object), importing the style-props type:

```tsx
//
// Block
//

const COLUMN_BLOCK_NAME = 'Column.Block';

type ColumnBlockProps = SlottableProps<{ end?: boolean; compact?: boolean; square?: boolean }>;

/**
 * A gutter slot inside a `Column.Row`. Sized to `--dx-rail-item` and centers its child.
 * `end` opts into the trailing gutter (column 3); default is the leading gutter (column 1).
 * Pass any child (`<Icon>`, `IconButton`, `Avatar`). Placement is via `data-slot`, so it is
 * robust to conditional rendering and DOM order.
 */
const ColumnBlock = slottable<HTMLDivElement, ColumnBlockProps>(
  ({ children, asChild, end, compact, square, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        {...rest}
        data-slot={end ? 'end' : 'start'}
        className={tx('column.block', { compact, square }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

ColumnBlock.displayName = COLUMN_BLOCK_NAME;
```

Update imports at top of `Column.tsx`:

```tsx
import { type ColumnBlockStyleProps } from './Column.theme';
```

(if `Column.tsx` does not already import from its theme, add the import; otherwise the type is only needed for `ColumnBlockProps` which inlines the shape — in that case skip the import.)

- [ ] **Step 3: Export `Column.Block` and its props type**

```tsx
export const Column = {
  Root: ColumnRoot,
  Row: ColumnRow,
  Block: ColumnBlock,
  Bleed: ColumnBleed,
  Center: ColumnCenter,
};

export type { ColumnRootProps, ColumnRowProps, ColumnBlockProps, ColumnBleedProps, ColumnCenterProps };
```

- [ ] **Step 4: Register `column.block` in the theme registry**

Find where `columnTheme` is wired into the global `tx`/theme (search `columnTheme` under `packages/ui/ui-theme` or `react-ui` theme index) and confirm `block` is picked up (object spread of `columnTheme` — no change needed if it spreads the whole object). If keys are listed explicitly, add `'column.block'` mapping.

Run: `cd /Users/burdon/Code/dxos/dxos && grep -rn "columnTheme" packages/ui`

- [ ] **Step 5: Build**

Run: `moon run react-ui:build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui/src/components/Column/Column.tsx packages/ui/react-ui/src/components/Column/Column.theme.ts
git commit -m "feat(react-ui): add Column.Block gutter slot"
```

---

## Phase 2 — Card

### Task 3: Add `Card.Block`, remove `Card.Icon`/`Card.IconBlock`, rework helpers

**Files:**

- Modify: `packages/ui/react-ui/src/components/Card/Card.tsx`
- Modify: `packages/ui/react-ui/src/components/Card/Card.theme.ts`

- [ ] **Step 1: Add `Card.Block` to `Card.tsx`**

Add a `CardBlock` part (themed `Column.Block`, subdued by default). Replace the `CardIconBlock`/`CardIcon` sections:

```tsx
//
// Block
//

const CARD_BLOCK_NAME = 'Card.Block';

type CardBlockProps = SlottableProps<{ end?: boolean; compact?: boolean; square?: boolean }>;

/**
 * Leading (default) or trailing (`end`) gutter slot of a Card row/header. Sized to the
 * rail-item square so a passive `<Icon>` aligns with an `IconButton`. Defaults text color to
 * `subdued` so a decorative `<Icon>` child needs no styling; interactive children set their own.
 */
const CardBlock = slottable<HTMLDivElement, CardBlockProps>(
  ({ children, asChild, end, compact, square, classNames, ...props }, forwardedRef) => {
    return (
      <Column.Block
        asChild={asChild}
        end={end}
        compact={compact}
        square={square}
        classNames={['text-subdued', classNames]}
        {...props}
        ref={forwardedRef}
      >
        {children}
      </Column.Block>
    );
  },
);

CardBlock.displayName = CARD_BLOCK_NAME;
```

Note: `Column.Block` props are `SlottableProps`, so spread `classNames` via its prop (it uses `composableProps`). Confirm `Column.Block` accepts `classNames` (it does — `slottable` → `composableProps`).

- [ ] **Step 2: Delete `CardIcon` and `CardIconBlock` definitions** (lines ~158-184) and remove `IconBlock`/`IconBlockProps` from the Card import if now unused. Keep `Icon`/`IconProps` import (still used by `CardPoster`, `CardAction`, `CardLink`).

- [ ] **Step 3: Rewrite header helpers to use `Card.Block` placement instead of `CardIconBlock`**

`CardDragHandle`, `CardActionIconButton`, `CardMenu` currently wrap their control in `<CardIconBlock>`. Wrap in `<CardBlock>` instead, and `CardMenu`'s trigger lands in the trailing gutter (`end`). Example for each:

```tsx
const CardDragHandle = forwardRef<HTMLButtonElement, CardDragHandleProps>((props, forwardedRef) => (
  <CardBlock>
    <Toolbar.DragHandle {...props} ref={forwardedRef} />
  </CardBlock>
));
```

```tsx
const CardActionIconButton = forwardRef<HTMLButtonElement, CardActionIconButtonProps>((props, forwardedRef) => (
  <CardBlock end>
    <Toolbar.ActionIconButton {...props} ref={forwardedRef} />
  </CardBlock>
));
```

```tsx
function CardMenu<T extends any | void = void>({ context, items, ...props }: CardMenuProps<T>) {
  return (
    <CardBlock end>
      <Toolbar.Menu {...props} context={context} items={items ?? []} />
    </CardBlock>
  );
}
```

NOTE: `Toolbar.DragHandle`/`ActionIconButton`/`Menu` still reference `Toolbar` even though `Card.Header` will no longer be a `Toolbar.Root`. These are plain `IconButton`-family controls; verify they render standalone (they do — `Toolbar.IconButton` works outside a toolbar, just without roving focus). If any throws without a toolbar context, switch to the non-toolbar `IconButton` equivalent.

- [ ] **Step 4: Update the `Card` namespace + exports** in `Card.tsx`:

Remove `IconBlock: CardIconBlock` and `Icon: CardIcon`; add `Block: CardBlock`. Add `CardBlockProps` to the exported types.

```tsx
export const Card = {
  Root: CardRoot,
  // Header
  Header: CardHeader,
  // Header / row parts
  Block: CardBlock,
  DragHandle: CardDragHandle,
  ActionIconButton: CardActionIconButton,
  Menu: CardMenu,
  Title: CardTitle,
  // Body
  Body: CardBody,
  Section: CardSection,
  Row: CardRow,
  // Body parts
  Text: CardText,
  Html: CardHtml,
  Poster: CardPoster,
  Action: CardAction,
  Link: CardLink,
};
```

- [ ] **Step 5: Build (expect failures only in `CardAction`/`CardLink` which used `CardIcon`)**

`CardAction` and `CardLink` use `CardIcon` internally. Replace those internal uses with `<Column.Block><Icon .../></Column.Block>` or a plain `<Icon>` as appropriate (they are inside a flex button, not a row — a bare `<Icon>` is correct; keep the existing `size={4}`/classNames). Update those two functions.

Run: `moon run react-ui:build`
Expected: PASS after fixing `CardAction`/`CardLink`.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/react-ui/src/components/Card/Card.tsx packages/ui/react-ui/src/components/Card/Card.theme.ts
git commit -m "feat(react-ui): add Card.Block; remove Card.Icon/Card.IconBlock"
```

### Task 4: `Card.Row` — drop `icon`; set `--icon-size` 4

**Files:**

- Modify: `packages/ui/react-ui/src/components/Card/Card.tsx` (`CardRow`)

- [ ] **Step 1: Rewrite `CardRow`** to remove the `icon` prop and set the row's icon size:

```tsx
import { iconSize } from '@dxos/ui-theme'; // already imported

type CardRowProps = { fullWidth?: boolean };

/**
 * A row inside a Card.
 * - Default: spans all 3 columns as a subgrid; children align via `data-slot`
 *   (`Card.Block` → gutters, anonymous → content). Sets `--icon-size` 4 for decorative icons.
 * - `fullWidth`: spans all columns without a subgrid — children do their own layout; blocks are inert.
 */
const CardRow = slottable<HTMLDivElement, CardRowProps>(
  ({ children, asChild, fullWidth, style, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        {...rest}
        style={{ ...iconSize(4), ...style }}
        className={tx('card.row', { fullWidth }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);
```

(`JSX` import may now be unused — remove from the React import if so.)

- [ ] **Step 2: Build**

Run: `moon run react-ui:build`
Expected: PASS (the `react-ui` package itself; call-site packages break in Phase 4).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui/src/components/Card/Card.tsx
git commit -m "feat(react-ui): drop Card.Row icon prop; inherit icon size"
```

### Task 5: `Card.Header` — plain `<header>`, `--icon-size` 5, drop Toolbar

**Files:**

- Modify: `packages/ui/react-ui/src/components/Card/Card.tsx` (`CardHeader`)
- Modify: `packages/ui/react-ui/src/components/Card/Card.theme.ts` (`header`)

- [ ] **Step 1: Rewrite `CardHeader`** as a slottable header sharing the row layout:

```tsx
type CardHeaderProps = SlottableProps<{ density?: Density }>;

/**
 * Top header row of a Card. Shares `Card.Row`'s subgrid + `data-slot` layout; renders as a
 * `<header>` (not a toolbar — most headers have 0–1 controls, so `role="toolbar"` was incorrect).
 * Sets `--icon-size` 5 (header icons are larger than row icons).
 */
const CardHeader = slottable<HTMLDivElement, CardHeaderProps>(
  ({ children, asChild, density: _density, classNames, style, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Comp = asChild ? Slot : Primitive.header;
    return (
      <Comp
        {...(composableProps({ ...props, classNames }).rest ?? {})}
        style={{ ...iconSize(5), ...style }}
        className={tx('card.header', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);
```

NOTE: match the exact `composableProps` destructure pattern used by sibling parts (`const { className, ...rest } = composableProps(props)`); the snippet above is illustrative — follow `CardRow`'s exact shape, using `Primitive.header` for the element. `density` is accepted for source-compat but no longer drives a toolbar; drop it if unused after migration audit.

- [ ] **Step 2: Update `header` theme** in `Card.theme.ts` to drop toolbar-specific classes and add `data-slot` routing (same as `row`):

```ts
const header: ComponentFunction<CardStyleProps> = (_, ...etc) =>
  mx(
    'dx-card__header col-span-3 grid grid-cols-subgrid items-center',
    '[&>[data-slot=start]]:col-start-1',
    '[&>[data-slot=end]]:col-start-3',
    '[&>*:not([data-slot])]:col-start-2',
    ...etc,
  );
```

- [ ] **Step 3: Remove now-unused `Toolbar`/`ToolbarRootProps`/`iconSize` imports if orphaned** (keep `iconSize` — still used by Row/Header; keep `Toolbar` — still used by DragHandle/ActionIconButton/Menu helpers).

- [ ] **Step 4: Build**

Run: `moon run react-ui:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui/src/components/Card/Card.tsx packages/ui/react-ui/src/components/Card/Card.theme.ts
git commit -m "feat(react-ui): Card.Header is a plain header sharing Row layout"
```

### Task 6: Update `Card.stories.tsx`

**Files:**

- Modify: `packages/ui/react-ui/src/components/Card/Card.stories.tsx`

- [ ] **Step 1: Migrate existing stories** off `Card.Row icon=`/`Card.Icon`/`Card.IconBlock` to `Card.Block`, and add stories proving: start-only, end-only, both, `asChild`, conditional (falsy) block, `fullWidth` (blocks inert), Header vs Row icon size (5 vs 4), and passive-`Icon`-vs-`IconButton` alignment.

```tsx
<Card.Row>
  <Card.Block>
    <Icon icon='ph--dot-outline--regular' />
  </Card.Block>
  <Card.Text>Card.Text (default)</Card.Text>
  <Card.Block end>
    <IconButton iconOnly variant='ghost' icon='ph--x--regular' label='Remove' onClick={() => {}} />
  </Card.Block>
</Card.Row>
```

- [ ] **Step 2: Verify in Storybook** (already running on :9009; if not, start on an alternate port).

Run: `curl -s localhost:9009 >/dev/null && echo up || moon run storybook-react:serve --port 9010`
Then load the `Card` stories and confirm alignment + no console errors (use preview tools).

- [ ] **Step 3: Commit**

```bash
git add packages/ui/react-ui/src/components/Card/Card.stories.tsx
git commit -m "test(react-ui): Card.Block stories"
```

---

## Phase 3 — Dialog

### Task 7: `Dialog.Block`, `Dialog.Row`, `Dialog.Header` routing

**Files:**

- Modify: `packages/ui/react-ui/src/components/Dialog/Dialog.tsx`
- Modify: `packages/ui/react-ui/src/components/Dialog/Dialog.theme.ts`

- [ ] **Step 1: Add `DialogRow` + `DialogBlock`** (themed `Column.Row`/`Column.Block`). `Dialog.Content` already wraps children in `Column.Root` (gutter `sm`), so a `Column.Row` child works directly:

```tsx
const DialogRow = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  const { className, ...rest } = composableProps(props);
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...rest} style={iconSize(4)} className={tx('dialog.row', {}, className)} ref={forwardedRef}>
      {children}
    </Comp>
  );
});
DialogRow.displayName = 'Dialog.Row';

type DialogBlockProps = SlottableProps<{ end?: boolean; compact?: boolean; square?: boolean }>;
const DialogBlock = slottable<HTMLDivElement, DialogBlockProps>(
  ({ children, asChild, end, compact, square, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp
        {...rest}
        data-slot={end ? 'end' : 'start'}
        className={tx('dialog.block', { compact, square }, className)}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);
DialogBlock.displayName = 'Dialog.Block';
```

Import `iconSize` from `@dxos/ui-theme`.

- [ ] **Step 2: Convert `DialogHeader`** from flex to the subgrid row layout (so title→content, close/actions→`end`). Change the `header` theme:

```ts
const header: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx(
    'dx-dialog__header col-span-3 grid grid-cols-subgrid items-center pb-4',
    '[&>[data-slot=start]]:col-start-1',
    '[&>[data-slot=end]]:col-start-3',
    '[&>*:not([data-slot])]:col-start-2',
    ...etc,
  );

const row: ComponentFunction<DialogStyleProps> = (_props, ...etc) =>
  mx('dx-dialog__row col-span-3 grid grid-cols-subgrid items-center', ...etc);

const block: ComponentFunction<DialogStyleProps & { compact?: boolean; square?: boolean }> = (
  { compact, square },
  ...etc
) =>
  mx(
    'grid place-items-center',
    square ? 'aspect-square' : 'w-[var(--dx-rail-item)]',
    compact ? '' : 'h-[var(--dx-rail-item)]',
    ...etc,
  );
```

Add `row` and `block` to `dialogTheme`.

NOTE: Dialog title is rendered by `Dialog.Title` (a `DialogPrimitive.Title`), which has no `data-slot` → routes to content (col 2). `Dialog.ActionIconButton`/close go in `<Dialog.Block end>`. Verify the title's heading semantics survive (it does — placement is CSS only).

- [ ] **Step 3: Export `Row`/`Block`** in the `Dialog` namespace and add `DialogRowProps`/`DialogBlockProps` to exported types.

- [ ] **Step 4: Build**

Run: `moon run react-ui:build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/react-ui/src/components/Dialog
git commit -m "feat(react-ui): add Dialog.Row/Dialog.Block; route Dialog.Header by data-slot"
```

---

## Phase 4 — Migrate call sites (batched per package, build-green per commit)

Migration patterns (apply mechanically):

- `<Card.Row icon='ph--x--regular'>…` → `<Card.Row><Card.Block><Icon icon='ph--x--regular' /></Card.Block>…</Card.Row>` (import `Icon` from `@dxos/react-ui`).
- `<Card.Row icon={<El/>}>…` → `<Card.Row><Card.Block><El/></Card.Block>…</Card.Row>`.
- `<Card.Icon icon='x' … />` → `<Card.Block><Icon icon='x' … /></Card.Block>` (carry over `classNames`/`size` onto the `Icon`).
- `<Card.IconBlock>…</Card.IconBlock>` → `<Card.Block>…</Card.Block>`; if it held a trailing/menu control, add `end`.
- Trailing `IconButton`s sitting loose in row/header content → wrap in `<Card.Block end>`.
- Standalone `IconBlock` (from `@dxos/react-ui`, not `Card.*`) → **leave unchanged**.
- `Dialog.Header` with a loose close button → `<Dialog.Header><Dialog.Title/>…<Dialog.Block end><Dialog.ActionIconButton action='close'/></Dialog.Block></Dialog.Header>` where gutter alignment is desired (optional; only where the old flex layout looked wrong).

For each package below: edit files, run `moon run <pkg>:build`, fix, then commit `refactor(<pkg>): migrate to Card.Block`.

### Task 8: Migrate `react-ui` sibling packages

**Files (per `grep` inventory):**

- `react-ui-mosaic`: `src/testing/DefaultStackTile.tsx`, `src/components/SearchStack/SearchStack.tsx`, `src/components/Board/Item.tsx`
- `react-ui-board`: `src/components/Board/Board.stories.tsx`
- `react-ui-masonry`: `src/Masonry.stories.tsx`
- `react-ui-editor`: `src/stories/Preview.stories.tsx`

- [ ] Edit each, applying the patterns above. Leave standalone `IconBlock` usages alone.
- [ ] Build each: `moon run react-ui-mosaic:build` (etc.).
- [ ] Commit: `refactor(react-ui-mosaic): migrate to Card.Block` (group per package).

### Task 9: Migrate plugins — group A (preview, feed, trip, inbox)

**Files:**

- `plugin-preview`: `cards/PersonCard.tsx`, `cards/OrganizationCard.tsx`, `cards/TaskCard.tsx`, `cards/FormCard.tsx`, `stories/Card.stories.tsx`
- `plugin-feed`: `components/SubscriptionStack/SubscriptionStack.tsx`, `components/PostStack/PostStack.tsx`, `containers/PostCard/PostCard.tsx`, `containers/MagazineArticle/MagazineTile.tsx`
- `plugin-trip`: `components/SegmentCard/SegmentEditableCard.tsx`, `components/SegmentCard/SegmentCard.tsx`, `components/OfferStack/OfferStack.tsx`
- `plugin-inbox`: `components/Message/Message.tsx`, `components/MessageStack/MessageStack.tsx`, `components/Event/EventDetails.tsx`, `components/Event/EventEditor.tsx`, `components/Header/Header.tsx`, `containers/MessageCard/MessageCard.tsx`

- [ ] Edit, build each plugin (`moon run plugin-preview:build`, …), fix, commit per plugin.

### Task 10: Migrate plugins — group B (rest)

**Files:**

- `plugin-deck`: `containers/DeckLayout/Popover.tsx`
- `plugin-bookmarks`: `containers/BookmarkCard/BookmarkCard.tsx`, `containers/BookmarkArticle/BookmarkArticle.tsx`
- `plugin-markdown`: `containers/MarkdownCard/MarkdownCard.tsx`, `containers/EditableMarkdownCard/EditableMarkdownCard.tsx`
- `plugin-table`: `containers/TableCard/TableCard.tsx`
- `plugin-voxel`: `containers/VoxelCard/VoxelCard.tsx`
- `plugin-kanban`: `testing/KanbanCardTileSimple.tsx`
- `plugin-commerce`: `containers/ResultCard/ResultCard.tsx`
- `plugin-pipeline`: `components/PipelineComponent/PipelineColumn.tsx`
- `plugin-assistant`: `containers/AgentArticle/AgentArticle.tsx`
- `plugin-search`: `components/SearchResultStack/SearchResultStack.tsx`
- `stories-assistant`: `src/components/ContextModule.tsx`

- [ ] Edit, build each, fix, commit per plugin.

### Task 11: Sweep for stragglers + Card.Header / Dialog.Header reslots

- [ ] **Step 1: Grep for any remaining removed symbols**

Run:

```bash
cd /Users/burdon/Code/dxos/dxos && grep -rn "Card\.Icon\b\|Card\.IconBlock\|Card\.Row[^>]*icon=" packages --include="*.tsx"
```

Expected: no matches (only the standalone `IconBlock` remains).

- [ ] **Step 2: Visually verify the ~20 multi-control `Card.Header`s** still tab through controls and align (Storybook + a few plugin stories via preview tools). Reslot any header whose buttons should sit in the trailing gutter using `<Card.Block end>`.

- [ ] **Step 3: Verify `Dialog.Header` call sites** (24 files) still render title-left / close-right correctly after the flex→subgrid change. Where a header relied on `justify-between` flex with >2 children, wrap controls in `Dialog.Block` slots.

- [ ] **Step 4: Commit any reslot fixes.**

---

## Phase 5 — Verify

### Task 12: Full build / lint / test + cast audit

- [ ] **Step 1: Build everything**

Run: `moon exec --on-failure continue --quiet :build`
Expected: all green.

- [ ] **Step 2: Lint**

Run: `moon run :lint -- --fix`
Expected: clean.

- [ ] **Step 3: Tests**

Run: `MOON_CONCURRENCY=4 moon run :test -- --no-file-parallelism`
Expected: pass.

- [ ] **Step 4: Cast audit**

Run: `git diff origin/main | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: no new casts (justify or remove any).

- [ ] **Step 5: Final commit / clean tree**

Run: `git status` → clean.

---

## Self-Review notes

- Spec coverage: Column.Block (T2), Column.Row routing (T1), Card.Block (T3), Card.Row icon removal (T4), Card.Header plain+size (T5), stories (T6), Dialog.Row/Block/Header (T7), IconBlock kept (T2/T3 reuse geometry; migration leaves it), Card.Icon/IconBlock removed (T3), full migration (T8–T11), a11y (Block sets no blanket aria-hidden — verified in T3 code), verify (T12). ✓
- The illustrative `CardHeader` snippet in T5 must be reconciled to the exact `composableProps` destructure used by `CardRow`/`CardBody` — do not ship the `?? {}` placeholder; follow the sibling pattern.
- Icon size: Row sets `iconSize(4)`, Header `iconSize(5)`; decorative `<Icon>` children omit `size` to inherit (T4/T5).

# SystemIconButton presets

## Problem

`react-ui` has several recurring `IconButton` usage patterns that are hand-rolled at every
call site:

- **Star on/off** — `icon={starred ? 'ph--star--fill' : 'ph--star--regular'}` repeated across feed
  and commerce plugins.
- **Expander open/close** — a caret that rotates 90° to signal disclosure, repeated across form and
  list components (already partly served by the generic `ToggleIconButton`).
- **Add / Delete / Edit / Close** — conventional icon + label pairs (`ph--plus`, `ph--trash`,
  `ph--pen`, `ph--x`) repeated across dozens of call sites.

A `caretDown` boolean was recently added directly to `IconButton` to support the dropdown-trigger
caret. That made the base component heavier without addressing the broader pattern. The base
`IconButton` should stay lean; the standard affordances belong behind named presets so call sites
declare intent (`SystemIconButton.Star`) instead of re-specifying icons and rotate logic.

## Decision

Introduce a new `SystemIconButton` namespace that collects the standard presets. The namespace is a
plain object of thin wrapper components — it does not itself render a button.

The base components keep their roles:

- `IconButton` — no longer renders its own caret. `caretDown` moved up to `Button` as a common prop
  (see "Done alongside this work"); `IconButton` inherits it.
- `ToggleIconButton` — unchanged generic boolean-toggle button (`active` / `icon` / `activeIcon`,
  rotate-90 when `activeIcon` is omitted). Presets wrap it; its own definition is not polluted with
  preset-specific defaults.

## Scope

In scope:

- Stateful presets: `SystemIconButton.Star`, `SystemIconButton.Bookmark`, `SystemIconButton.Expander`.
- Static presets: `SystemIconButton.Add`, `SystemIconButton.Delete`, `SystemIconButton.Edit`,
  `SystemIconButton.Close`.
- Default labels: each preset defaults its `label` via `useTranslation` (`system-button.*` keys);
  callers can override.
- Migrate genuine `IconButton` / `ToggleIconButton` star/expander call sites to the presets.
- A storybook covering all presets.

Deferred (not this change):

- Bulk migration of the ~40+ Add/Delete/Edit/Close call sites. The static presets ship with the
  storybook; existing sites migrate incrementally afterward.

Done alongside this work (was previously deferred):

- The `rootProps as any` cast in `ToolbarMenu.tsx` was removed by splitting the dropdown trigger into
  two typed branches.
- `caretDown` is now a common `Button` prop (shared with `IconButton`), and is opt-out-able per menu
  group via `MenuItemGroupProperties.caretDown` (defaults `true`; set `false` when the icon already
  signals a menu, e.g. an overflow ⋮).

## Design

### New file: `packages/ui/react-ui/src/components/Button/SystemIconButton.tsx`

```ts
export const SystemIconButton = {
  // Stateful (wrap ToggleIconButton).
  Star,
  Bookmark,
  Expander,
  // Static (wrap IconButton).
  Add,
  Delete,
  Edit,
  Close,
};
```

Each preset is a `forwardRef` component presetting the icon(s)/behaviour and a default `label`. All
other props (`variant`, `density`, `iconOnly`, `size`, `onClick`, …) pass through; `label` is
optional and defaults via `useTranslation` (overridable by the caller).

**Stateful presets** wrap `ToggleIconButton`; prop types derive from `ToggleIconButtonProps` with
`icon`, `activeIcon`, and `label` omitted, so a preset cannot be handed a conflicting icon. Their
default label tracks `active`.

- **`SystemIconButton.Star`** — `icon='ph--star--regular'`, `activeIcon='ph--star--fill'`. `active`
  means starred (label Star/Unstar). `iconClassNames` remains overridable to tint the filled star.
- **`SystemIconButton.Bookmark`** — `icon='ph--bookmark-simple--regular'`,
  `activeIcon='ph--bookmark-simple--fill'`. `active` means bookmarked (label Bookmark/Remove bookmark).
- **`SystemIconButton.Expander`** — `icon='ph--caret-right--regular'`, no `activeIcon` (so the base
  applies the 90° rotation). `active` means expanded/open (label Expand/Collapse).

**Static presets** wrap `IconButton`; prop types derive from `IconButtonProps` with `icon` and
`label` omitted. They preset the icon and a default label.

- **`SystemIconButton.Add`** — `icon='ph--plus--regular'`.
- **`SystemIconButton.Delete`** — `icon='ph--trash--regular'` (destructive delete).
- **`SystemIconButton.Edit`** — `icon='ph--pen--regular'`.
- **`SystemIconButton.Close`** — `icon='ph--x--regular'` (dismiss / close).

### Exports

Add `export * from './SystemIconButton';` to
`packages/ui/react-ui/src/components/Button/index.ts`.

### Storybook

A `System` story added to `packages/ui/react-ui/src/components/Button/IconButton.stories.tsx` (rather
than a separate file). It registers `translations` so default labels resolve, and lays every preset
out in a subgrid with `default` / `ghost` / `iconOnly` columns; stateful presets (`Star`, `Bookmark`,
`Expander`) are toggleable.

## Migrations

### `SystemIconButton.Star` — done

- `packages/plugins/plugin-feed/src/containers/MagazineArticle/MagazineTile.tsx`
- `packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.tsx`
- `packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx`

Each previously used `IconButton` with `icon={starred ? fill : regular}` and a starred label; now
`SystemIconButton.Star active={starred}` (default labels).

Additionally, `SearchArticle.tsx`'s toolbar was rebuilt from the `useMenuBuilder` action-graph idiom
(a single-select `toggleGroup`), replacing the hand-wired `Toolbar.ToggleGroup` and its plain `<Icon>`.

**Not migrated** (menu-action config objects, not components):

- `MagazineToolbar.tsx`, `PostToolbar.tsx` — `icon: …` properties in a `MenuBuilder` action.

### `SystemIconButton.Expander` — deferred

The disclosure/rotate sites (FormFieldSet, SelectOptionField, OrderedListItem, JsonCard) still use the
generic `ToggleIconButton`; migrating them to `SystemIconButton.Expander` is a follow-up. `ViewEditor`
uses an `activeIcon` swap (eye / eye-closed) and stays on `ToggleIconButton` regardless.

## Testing

- Storybook `System` story renders every preset; stateful presets toggle and default labels resolve.
- `react-ui`, `react-ui-menu`, `plugin-feed`, `plugin-commerce` builds + lint pass.
- No new casts introduced (audit the diff per repo policy).

## Risks

- Low. Presets are pure wrappers; migrations are local prop renames. The generic `ToggleIconButton`
  and `IconButton` keep their current behaviour, so non-migrated call sites are unaffected.

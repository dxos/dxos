# SystemIconButton presets

## Problem

`react-ui` has several recurring `IconButton` usage patterns that are hand-rolled at every
call site:

- **Star on/off** — `icon={starred ? 'ph--star--fill' : 'ph--star--regular'}` repeated across feed
  and commerce plugins.
- **Expander open/close** — a caret that rotates 90° to signal disclosure, repeated across form and
  list components (already partly served by the generic `ToggleIconButton`).
- **Add** (`ph--plus`) and **Delete** (`ph--x`) — conventional icon + label pairs.

A `caretDown` boolean was recently added directly to `IconButton` to support the dropdown-trigger
caret. That made the base component heavier without addressing the broader pattern. The base
`IconButton` should stay lean; the standard affordances belong behind named presets so call sites
declare intent (`SystemIconButton.Star`) instead of re-specifying icons and rotate logic.

## Decision

Introduce a new `SystemIconButton` namespace that collects the standard presets. The namespace is a
plain object of thin wrapper components — it does not itself render a button.

The existing components are left untouched:

- `IconButton` — unchanged. `caretDown` **stays** (removing it pushed complexity into `ToolbarMenu`
  and lost the tooltip behaviour; out of scope here).
- `ToggleIconButton` — unchanged generic boolean-toggle button (`active` / `icon` / `activeIcon`,
  rotate-90 when `activeIcon` is omitted). Presets wrap it; its own definition is not polluted with
  preset-specific defaults.

## Scope

In scope:

- `SystemIconButton.Star` and `SystemIconButton.Expander`.
- Migrate genuine `IconButton` / `ToggleIconButton` call sites to the presets.
- A storybook for the new presets.

Deferred (not this change):

- `SystemIconButton.Add` / `SystemIconButton.Delete` presets.
- The `rootProps as any` cast in `ToolbarMenu.tsx` (the union-typed props hack). Revisit after the
  presets land.

## Design

### New file: `packages/ui/react-ui/src/components/Button/SystemIconButton.tsx`

```ts
export const SystemIconButton = {
  Star,
  Expander,
};
```

Each preset is a `forwardRef` component that wraps `ToggleIconButton`, presetting only the icon(s)
and behaviour. All other props (`label`, `active`, `variant`, `density`, `iconOnly`, `size`,
`onClick`, …) pass through.

- **`SystemIconButton.Star`** — `icon='ph--star--regular'`, `activeIcon='ph--star--fill'`. `active`
  means starred. `iconClassNames` remains overridable so a call site can tint the filled star.
- **`SystemIconButton.Expander`** — `icon='ph--caret-right--regular'`, no `activeIcon` (so the base
  applies the 90° rotation). `active` means expanded/open.

Prop types derive from `ToggleIconButtonProps` with `icon` (and `activeIcon` where fixed) omitted,
so a preset cannot be handed a conflicting icon.

### Exports

Add `export * from './SystemIconButton';` to
`packages/ui/react-ui/src/components/Button/index.ts`.

### Storybook

New `packages/ui/react-ui/src/components/Button/SystemIconButton.stories.tsx` demonstrating each
preset in its inactive and active states across densities, mirroring the existing
`IconButton.stories.tsx` layout.

## Migrations

### `SystemIconButton.Star` (real `IconButton` toggles only)

- `packages/plugins/plugin-feed/src/containers/MagazineArticle/MagazineTile.tsx`
- `packages/plugins/plugin-commerce/src/containers/ResultCard/ResultCard.tsx`
- `packages/plugins/plugin-commerce/src/containers/SearchArticle/ResultDetail.tsx`

Each currently uses `IconButton` with `icon={starred ? fill : regular}` and a starred label; replace
with `SystemIconButton.Star active={starred}`.

**Not migrated** (not buttons, leave as-is):

- `MagazineToolbar.tsx`, `PostToolbar.tsx` — menu-action config objects (`icon: …`), not components.
- `SearchArticle.tsx` — a plain `<Icon>` inside a `ToggleGroup.Item`.

### `SystemIconButton.Expander` (disclosure/rotate sites)

- `packages/ui/react-ui-form/src/components/Form/FormFieldSet/FormFieldSet.tsx`
- `packages/ui/react-ui-form/src/components/Form/FormField/fields/SelectOptionField/SelectOptionField.tsx`
- `packages/ui/react-ui-list/src/components/OrderedList/OrderedListItem.tsx`
- `packages/plugins/plugin-preview/src/cards/JsonCard.tsx`

These use `ToggleIconButton` with `icon='ph--caret-right--regular'` and no `activeIcon`; replace with
`SystemIconButton.Expander active={…}`.

**Not migrated:**

- `ViewEditor.tsx` — uses `ToggleIconButton` with `activeIcon` (eye / eye-closed icon swap), which is
  a generic toggle, not an expander. Stays on `ToggleIconButton`.

## Testing

- Storybook renders both presets in inactive/active states.
- `moon run react-ui:test`, `react-ui-form:test`, `react-ui-list:test`, and the affected plugin
  builds pass.
- Lint clean; no new casts introduced (audit the diff per repo policy).

## Risks

- Low. Presets are pure wrappers; migrations are local prop renames. The generic `ToggleIconButton`
  and `IconButton` keep their current behaviour, so non-migrated call sites are unaffected.

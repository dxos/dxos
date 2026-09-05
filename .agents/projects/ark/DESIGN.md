# Ark port — design notes

Companion to `TASKS.md`. The migration plan itself is `packages/ui/react-ui/docs/MIGRATION.md`; this
file holds the decisions that shape the API after the port.

## Menus: inert parts in `react-ui`, action-driven builders in `react-ui-menu`

Decided 2026-09-05.

### The layering

- **`react-ui` is a parts kit.** `Menu` is inert in the sense Ark's is: the caller renders every
  item and sets every property. It knows nothing of actions, labels, icons, shortcuts or attention.
  Its surface matches `Select`: `Root · Trigger · ContextTrigger · VirtualTrigger · Portal · Content ·
  Viewport · Item · ItemIndicator · CheckboxItem · RadioGroup · RadioItem · Group · GroupLabel ·
  Separator · Arrow · Sub · SubTrigger · SubContent`. Ark's `Positioner` stays inside `Content`
  (elevation and placement live there); `Portal` stays a part because it is optional, takes a
  container and re-bridges React context across the DOM move; `Viewport` stays a part because it is
  the bounded scroll area the `Arrow` must sit outside of. `DropdownMenu` and `ContextMenu` become
  aliases of `Menu` and are removed in a later sweep of the ~100 part-level sites.
- **`react-ui-menu` builds from the action graph.** It keeps the data side as it is — `MenuBuilder`,
  `useMenuBuilder`, `useMenuActions`, `useGraphMenuActions`, `createMenuAction`, dispositions,
  `applyPresentation` — and renders through two builders that *compose* `react-ui` rather than
  extend it. Nothing it exports mirrors a `react-ui` namespace; `Menu.Toolbar`, `Menu.Items`,
  `Menu.Content` and `useMenu` go.
- **`react-ui-list` builds from collections.** `Combobox`, `Listbox`, `Picker`, `Tree`, and later a
  data-fed `Select` — a Select is a value picker, not a command, so it is not action-driven.
  `react-ui-list` depends on `react-ui-menu`; the reverse must never hold.

### The two builders

```tsx
const menu = useMenuBuilder((get) => …, deps, { onAction, caller, iconSize });

<ActionToolbar {...menu} attendableId={id} classNames={…}>{children}</ActionToolbar>

<ActionMenu {...menu} group={group} | items={items}>
  <Toolbar.IconButton icon='ph--dots-three--regular' label='More' />   {/* the trigger */}
</ActionMenu>
```

- `ActionToolbar` is a whole `Toolbar.Root` whose children are driven from `MenuActions`: an action
  renders `Toolbar.IconButton` / `Toolbar.Button` / a switch, a dropdown group an `ActionMenu` with a
  toolbar trigger, a toggle group `Toolbar.ToggleGroup`, a separator `Toolbar.Separator`. Its own
  `children` render after the graph items (the 5 mixed sites all append; the 2 that prepend are
  adjusted). `attendableId` is fine at this layer — the package sits at the app level and already
  depends on `react-ui-attention` — and becomes `Toolbar.Root disabled` underneath.
- `ActionMenu` is a whole `Menu.Root` driven from `MenuActions`, trigger as its child. Because it is a
  complete menu, it embeds in a hand-written `Toolbar.Root` alongside plain `Toolbar.Button`s, which
  is how a site interleaves its own controls with graph-driven ones. Groups inside it render as
  `Menu.Sub`, resolved when they open.
- Both keep small private components (a toolbar action needs pending state; a submenu resolves its
  own items) — private, not exported.

### `MenuActions` carries the menu's identity

`useMenuBuilder` / `useMenuActions` return the one object every builder is fed:

- `items(group)` — the atom-family accessor, as today.
- `onAction`, `caller`, `iconSize` — set once, so every rendering of the menu behaves the same and no
  context threads them.
- the contribution registry — created by the hook, so `useMenuContribution(menu, props)` registers
  against the object. Card, which today provides `Menu.Root` so descendants can contribute, puts
  `menu` on its own context and hands it to both the trigger and the contributors: the wiring is
  Card's, which is where the relationship is. No provider in `react-ui-menu`.

### What this replaces

The 2026-09-05 "menu split" (`DropdownMenu.Entries`, `Toolbar.Entries`, `MenuEntriesProvider`, the
`MenuEntry` model in `ui-types`) put a data-driven renderer *in* `react-ui`; it is reverted by this
design. The `keyBinding` field on the shared chrome stays.

### Follow-ups (tracked in `TASKS.md`)

- Rename `react-ui-menu` → `react-ui-actions` in its own PR (46 manifests).
- Remove the `DropdownMenu` / `ContextMenu` aliases once the part-level sites are re-pointed.
- Data-fed `Select` in `react-ui-list`, beside `Combobox`.

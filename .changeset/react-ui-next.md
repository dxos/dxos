---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

The react-ui cut-over: the Next components (Ark UI primitives styled by `.nx-*` theme rules) replace the current
`@dxos/react-ui` components, which are removed, and every package and plugin now renders on them.

- `@dxos/react-ui` exports a Next counterpart for every former component (`Avatar`, `Tabs`, `Main`, `Splitter`,
  `Toast`, `Tour`, `Menu`, `MenuButton`, `Combobox`, `Card`, `Panel`, `Container`, `Field`, `Fieldset`, `Input`, …),
  sized by `data-size` scopes (`xs`–`xl`), with Container rails and subgrids, a shared `Empty`, a `ControlFrame` under
  Input's adornments (`Input copyable`, `variant='mono'`), `Menu.Content columns` for palettes, and
  `useMainLandmark` for app-declared focus areas (Tab and Arrow Left/Right move between them).
- `Combobox` gains a trigger mode, option descriptions, a create row, async results and `getAnchorRect`; Content's
  `empty` prop is replaced by the `Empty` part. Menus open at `md` and grow to the available height before scrolling.
- `@dxos/react-ui-list` exports `Listbox`, `OrderedList` (a collapsible `Item` with a `Detail` part replaces
  `DetailItem`) and `Tree` on Ark's listbox and tree-view, with virtual rows, drag and drop and disclosure animation; a
  branch with no children shows a disabled caret.
- `@dxos/react-ui-form` is the Next `Form` (`Root`, `Viewport`, `Content`, `FieldSet`, `Fields`, `Field`, `Actions`, …)
  with the same contract, plus `ObjectProperties`, `ObjectPicker`, `ViewEditor` and `RefEditor`; `@dxos/react-ui-menu`
  renders `ActionToolbar` and `ActionMenu` on the Next Toolbar and Menu.
- `@dxos/echo` adds `Annotation.ArrayPresentationAnnotation` (`ordered`, `display: 'tag' | 'title'`) for reference
  arrays. `@dxos/types` titles `Geo.PostalAddress` fields, and `@dxos/effect` `SchemaEx.getProperties` keeps the
  annotations of an annotated optional field.
- `@dxos/ui-editor` markdown tables keep empty cells. `@dxos/ui-theme` adds `--color-focus` for the keyboard focus ring.
- `@dxos/plugin-markdown` marks `Document.description` as markdown; the rename popover shows an object's properties.

- `@dxos/react-ui` exports the components flat (`Button`, `Toolbar`, `Container`, …); the transitional `Next`
  namespace is removed. The standalone `Label` is no longer exported (use `Field.Label`), the `Switch`/`Match` flow
  helper is renamed `Match` (`Match.Root`/`Match.Case`), the layout `Container` is removed, and `Size` is the component
  size scale (`xs`–`xl`; the spacing `Size` stays in `@dxos/ui-types`).

Breaking: the former `@dxos/react-ui` component APIs are gone; import the components from `@dxos/react-ui` by name.

---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

`@dxos/react-ui` is rebuilt on Ark UI primitives styled by plain `dx-*` component CSS, and every UI package and plugin
renders on it; the former component APIs are removed.

- Components are exported flat by name (`Button`, `Toolbar`, `Card`, `Panel`, `Container`, `Field`, `Input`, `Combobox`,
  `Menu`, `Tabs`, `Main`, `Splitter`, `Toast`, `Tour`, `Banner`, `Empty`, …) and sized by `data-size` scopes (`xs`–`xl`;
  `Size` is that scale). `Container` lays out rails and subgrids, `ControlFrame` frames a control with adornments
  (`Input copyable`, `variant='mono'`), and `useMainLandmark` declares the app's focus areas (Tab and Arrow Left/Right
  move between them). `Combobox` adds a trigger mode, option descriptions, a create row and async results. `Label` is
  no longer public (use `Field.Label`), and the flow helper is `Match` (`Match.Root`/`Match.Case`).
- `@dxos/react-ui-list` provides `Listbox`, `OrderedList` and `Tree` (virtual rows, drag and drop, disclosure
  animation); `@dxos/react-ui-form` provides `Form` (`Root`, `Viewport`, `Content`, `Fields`, `Actions`, …),
  `ObjectProperties`, `ObjectPicker`, `ViewEditor` and `RefEditor`; `@dxos/react-ui-menu` renders `ActionToolbar` and
  `ActionMenu` on the new Toolbar and Menu; `@dxos/app-toolkit` adds the `ObjectCard` composite.
- `@dxos/ui-theme` renames the text tokens to `--color-fg`/`fg-muted`/`fg-subtle` (`text-fg`, `text-fg-muted`,
  `text-fg-subtle`; Typography and Icon `tone='muted' | 'subtle'`) and `--color-subdued-separator` to
  `--color-separator-subtle`, adds `--color-focus` for the keyboard focus ring, and derives the control fill from one
  offset off its host surface in both themes.
- `@dxos/echo` adds `Annotation.ArrayPresentationAnnotation` (`ordered`, `display: 'tag' | 'title'`) for reference
  arrays; `@dxos/effect` `SchemaEx.getProperties` keeps an annotated optional field's annotations; `@dxos/ui-editor`
  markdown tables keep empty cells; `@dxos/plugin-markdown` marks `Document.description` as markdown, and the rename
  popover shows an object's properties.

Breaking: the former `@dxos/react-ui` component APIs and the transitional `Next` namespace are gone; import components
from `@dxos/react-ui` by name and use the renamed theme tokens.

---
'@dxos/react-ui': minor
'@dxos/ui-theme': minor
---

`@dxos/react-ui/next` `Combobox` gains a trigger mode: a `Combobox.Trigger` outside `Control` is a value button, and a
`Combobox.Input` inside `Content` is the popup's search field. Options take a `description`, rendered by the new
`Combobox.ItemDescription`; `onCreate` adds a keyboard-selectable create row when nothing matches; `loading` and
`filter={null}` support results fetched per query, with new `Combobox.List` and `Combobox.Empty` parts. The popup can
anchor to any rect through `positioning.getAnchorRect`. Content's `empty` prop is replaced by the `Empty` part.

`@dxos/ui-theme` adds `--color-focus`, a semantic slot for keyboard focus (orange), which the Next focus ring now uses.

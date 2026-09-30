---
'@dxos/react-ui': minor
---

`@dxos/react-ui/next` `Combobox` gains a trigger mode: a `Combobox.Trigger` outside `Control` is a value button, and a
`Combobox.Input` inside `Content` is the popup's search field. Options take a `description`, rendered by the new
`Combobox.ItemDescription`; `onCreate` adds a keyboard-selectable create row when nothing matches; `loading` and
`filter={null}` support results fetched per query, with new `Combobox.List` and `Combobox.Empty` parts. The popup can
anchor to any rect through `positioning.getAnchorRect`. Content's `empty` prop is replaced by the `Empty` part.

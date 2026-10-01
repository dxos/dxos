---
'@dxos/react-ui': minor
'@dxos/react-ui-list': minor
'@dxos/plugin-registry': patch
'@dxos/plugin-sheet': patch
---

`@dxos/react-ui/next` adopts Ark's part names throughout (DESIGN.md "Part naming"): `Content` is always the component's
own element, scrolling is composed from `ScrollArea`, and items render a default row from their `item` data or are
composed from `ItemIcon`, `ItemText`, `ItemDescription` and `ItemIndicator`. New and renamed parts:

- `Next.Panel` hosts a plank as `Header`, `Body` and `Footer`; the header and footer size to their content.
- `Next.Listbox` (Ark listbox) with item groups; `Listbox.Content scroll={false}` joins a host that already scrolls.
- Drag and drop: `DragHandle` with keyboard moves, `DropIndicator`, `DragPreview`.
- `Menu.RadioItemGroup`, `Menu.TriggerItem` and `Fieldset` take Ark's names; Combobox exports `Control`, `Input`,
  `Trigger` and `ClearTrigger`; `Field.Label` marks required fields itself.
- `Tag` takes `onClick` and `onDelete`; `Icon` takes `valence`; `Card.Root` takes `grid` to put row icons and actions
  in its gutters; `Select.Trigger` takes `fit='options'`; `SystemButton.Remove` is a new preset.

Popups open at their trigger's size, grow to fit their options, and reserve room for the scroll thumb only while they
overflow. Tooltips open after 600ms, Combobox arrow keys stop at the ends, and NumberInput uses compact steppers and
tabular figures. A `./next/testing` entry exports the Next story helpers.

`@dxos/react-ui-list/next` is a new entry with `Listbox` and `OrderedList` on those parts, plus a private `Tree`
prototype on Ark's tree-view. Reorder drags declare a move, so the browser's copy cursor no longer flickers over the
dragged row, and `useReorderList`'s `dragPreview` renderer also receives the dragged row. The package now emits its
declared `./util` entry.

The plugin registry's list is the first surface on Next: rows in a `Next.Panel` under a filter toolbar. The sheet's
range list follows on `OrderedList`, and its ranges can now be reordered by drag or keyboard.

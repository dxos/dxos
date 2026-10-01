---
'@dxos/react-ui': minor
'@dxos/react-ui-list': minor
---

The Next lists build the group B decisions. `Next.Listbox` always runs Ark's listbox machine (`selectionMode='none'`
keeps navigation and typeahead), takes Root `columns` (rows become subgrids) and `virtual` (`'fixed'` windows rows
through the exported `Next.useVirtualRows`, `'variable'` uses `content-visibility`), and follows the ARIA grid
keyboard: ArrowRight enters a row, Tab moves between its controls, Escape or ArrowLeft returns, and row controls stay
out of the tab order. Rows share one `nx-row` state class and draw the drop line from `data-drop-target`, which
`useReorder` now sets. New: `Next.Empty` with an `Empty` part on each list, `ItemIcon` `hue`, a caret-only
`Collapsible.Trigger`, and `SystemButton.Remove` named by its row's text ("Delete <text>").

In `@dxos/react-ui-list/next`, OrderedList runs on Next.Listbox: `getId` is optional, `getLabel` labels typeahead and the
new default drag preview chip, and a collapsible `Item` (`collapsible`, `open`, `defaultOpen`, `onOpenChange`) with a
`Detail` part replaces `DetailItem`. `useStableIds` keeps generated ids beside plain arrays, and `listboxSelection`
adapts `useListSelection`-shaped values to Ark's selection.

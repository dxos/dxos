---
'@dxos/react-ui': minor
'@dxos/plugin-github': patch
---

`Listbox.Content` and `OrderedList.Content` no longer scroll themselves: wrap them in the new `Listbox.Viewport` / `OrderedList.Viewport` for a list that owns its scrolling, and leave them bare inside a host that scrolls. Breaking: the `scroll` prop is removed (drop `scroll={false}`; wrap lists that relied on the default in a `Viewport`). `Listbox.Root` gains `onHighlightChange`, rows laid out with Root `columns` centre their parts, card icons default one size step larger, and the GitHub pull request's checks list is compact, navigable with the arrow keys, and scrolls with its tab.

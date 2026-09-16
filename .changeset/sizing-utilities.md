---
'@dxos/ui-theme': minor
'@dxos/react-ui': minor
'@dxos/eslint-plugin-rules': minor
---

Split the sizing utilities and remove `dx-container`.

`dx-expander` is renamed `dx-expand` and decomposes into `dx-fill` (`h-full w-full`) and `dx-grow` (`flex-1 min-h-0 min-w-0`), so a class names how the parent sizes the element rather than bundling five properties. `dx-container` is removed: its `overflow-hidden` duplicated the `min-*-0` it already carried — any non-visible overflow zeroes a flex/grid item's automatic minimum size — and clipped everything as a side effect. Call sites that genuinely clip now say `overflow-hidden` explicitly. `dx-fullscreen` loses its `overflow-hidden` for the same reason.

`withColumn.propagate()` selected on `.dx-container` to keep a ScrollArea's scrollbar in the gutter; that marker is now an explicit `dx-scroll-boundary` on `ScrollArea.Root`.

Adds a `prefer-sizing-utilities` lint rule for the hand-rolled equivalents.

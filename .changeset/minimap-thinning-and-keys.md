---
'@dxos/react-ui-components': patch
---

`Minimap` now fits any rail height. When the markers would need more room than the container gives,
the ticks are thinned evenly — first and last kept — and each rendered tick stands for the span up to
the next one, so a thinned rail still covers the whole document and `visibleRange` lights the tick the
reader is actually under rather than nothing. An unbounded rail keeps its natural height as before.

The hover popover is anchored to a zero-height point at the hovered tick's centre instead of to the
rail, so it lines up with the tick rather than with the middle of the component; `align='center'`
ignores `alignOffset`, which is why offsetting the rail could not do this.

Arrow Up/Down moves between ticks once the rail has focus, stepping from the focused tick (not the
hovered one, which the pointer leaving the rail clears) and clamping to the ticks currently rendered.
The focus outline is suppressed: focus already shows as the tick extending and darkening, and an
outline around the invisible full-width row read as a stray box.

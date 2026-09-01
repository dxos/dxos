---
'@dxos/ui-theme': minor
'@dxos/eslint-plugin-rules': minor
---

Add `dx-shrink`, and remove the `min-*-0` that a clip had already applied.

`min-h-0` is widely read as "makes things scroll". It does not: it says the element may be **shorter than its content**, and without it a flex/grid item's minimum height is its content height, so it shoves its siblings out of the line. Measured in a 260px column above a 40px footer, the footer lands at 927px — outside the box — with nothing scrolling anywhere. Scrolling is only the consequence of finally being squeezed.

`dx-shrink` (`min-h-0 min-w-0`) names that intent, and `dx-grow` becomes `flex-1 dx-shrink` so the two decisions — may I be small, do I claim the rest — compose rather than hiding inside one bundle.

Also deletes 27 `min-*-0` that never did anything: a scroll container has already zeroed the same minimum, so a `min-h-0` beside `overflow-hidden`, `-auto` or `-scroll` is dead weight that reads as load-bearing. `overflow-clip` is excluded — it clips without scrolling, so the minimum still applies there. `prefer-sizing-utilities` now reports the redundant ones, and flags `dx-grow dx-fill` as the long spelling of `dx-expand`.

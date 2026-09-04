---
'@dxos/react-ui': minor
---

Add `gap`, `align`, `justify`, `wrap`, and `center` props to the `Flex` primitive. `gap` accepts only named steps of the theme spacing ramp (`xs`–`2xl`, plus `form` and `form-section`), so the prop uses named spacing tokens instead of arbitrary Tailwind literals; `classNames` remains an unrestricted escape hatch. The `Gap`, `Align`, and `Justify` unions are exported for reuse.

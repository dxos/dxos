---
'@dxos/react-ui': minor
---

Add `gap`, `align`, `justify`, `wrap`, and `center` props to the `Flex` primitive. `gap` accepts only named steps of the theme spacing ramp (`xs`–`2xl`, plus `form` and `form-section`), so layout gaps can no longer drift onto arbitrary Tailwind literals. The `Gap`, `Align`, and `Justify` unions are exported for reuse.

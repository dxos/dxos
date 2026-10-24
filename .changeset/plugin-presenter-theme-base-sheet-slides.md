---
'@dxos/plugin-presenter': minor
---

A presentation's `theme` sub-object names its base theme `base` (breaking: was `name`, with no migration), and a presentation's description is multi-line text. The theme shows once in a presentation's properties: `@dxos/react-ui-form` now hides a field whose `optional` wrapper is annotated `FormInputAnnotation.set(false)`. A sheet on a slide (`@dxos/plugin-sheet`, `role=slide`) shows only its used range, scaled down to fit its box and never past 1:1, with no toolbar or status bar.

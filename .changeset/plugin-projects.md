---
'@dxos/compute': minor
'@dxos/plugin-routine': minor
---

Add `Project` (`@dxos/compute`), the successor to `Topic`, holding owned instructions, routine references, and an artifacts collection; the `Routine` schema moves into `@dxos/compute` alongside it. `Instructions` gains a structured `commands` field, surfaced as sentinel-command autocomplete in the assistant chat prompt. The existing `@dxos/types` GH/Linear-style `Project` (name, description, image) is renamed to `ExternalProject` to free the typename for the new concept. `dx-input` now owns its full input chrome (padding, focus shift, a single-band ring/border treatment) so markdown-backed fields match plain inputs.

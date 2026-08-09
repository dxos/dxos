---
name: no-compat-shims
title: No compatibility re-exports when moving code
scope: repo
files:
  - 'packages/**/*.ts'
  - 'packages/**/*.tsx'
grep: compat|backward|@deprecated|re-export
severity: warn
---

When code moves, every call site must be updated in the same change — do not
leave a compatibility re-export or shim behind at the old location.

Flag re-export shims kept only for backwards compatibility (e.g.
`export * from './new-location'` or `export { X } from './moved'` left where the
implementation used to live), and comments announcing a temporary compat layer.
Genuine barrel/`index.ts` public-API re-exports are expected — do not flag those.

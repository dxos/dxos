---
'@dxos/plugin-illustrator': patch
---

`importDxSvg` returns the database's own drawing, so converting an imported drawing to another editor persists; `IllustratorCapabilities` exports `editTargets`, `editLabel` and `variantSlug` for hosts that offer the "Edit in …" actions outside the app graph.

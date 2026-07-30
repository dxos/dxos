---
'@dxos/plugin-registry': minor
---

Introduce three plugin quality tiers (`beta`, `alpha`, `labs`) and tag every non-system plugin with exactly one. The registry's `recommended` category is now an allowlist of `beta` and `alpha` rather than everything not tagged `labs`, so an untagged plugin is no longer surfaced as recommended by default. The `integration` tag is renamed to `connector`.

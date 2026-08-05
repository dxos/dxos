---
'@dxos/ui-theme': minor
---

Export design tokens as `@dxos/ui-theme/tokens.css`, so stylesheets compiled outside this repo — Composer plugins loaded from the registry — can generate token-backed utilities themselves rather than relying on whichever ones the host happens to bundle.

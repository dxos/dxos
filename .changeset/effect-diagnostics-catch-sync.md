---
'@dxos/plugin-onboarding': patch
'@dxos/edge-compute': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-doctor': patch
'@dxos/plugin-support': patch
---

Onboarding teardown awaits the manager's disposal instead of dropping the promise, so a failure during teardown is logged rather than surfacing as an unhandled rejection. Effect operations that previously left `unknown` in their error channel now carry a typed error.

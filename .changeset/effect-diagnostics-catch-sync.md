---
'@dxos/edge-compute': patch
---

Onboarding teardown now awaits the manager's disposal instead of dropping the promise, and Effect operations that previously left `unknown` in their error channel carry a typed error.

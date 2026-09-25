---
'@dxos/protocols': patch
'@dxos/plugin-onboarding': patch
---

Distinguish a rejected email login token from a recovery that failed for another reason, so a backend failure is no longer reported as an expired link.

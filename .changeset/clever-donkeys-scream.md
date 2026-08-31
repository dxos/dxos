---
'@dxos/plugin-onboarding': patch
---

Await the onboarding manager's async teardown when its module is disposed, so teardown failures surface instead of being dropped.

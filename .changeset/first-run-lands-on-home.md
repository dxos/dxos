---
'@dxos/plugin-onboarding': patch
---

First run lands on the default space's Home, where the seeded README is listed under Recent. The navigation moved out of plugin-support's `on-create-space` handler and into plugin-onboarding, which runs it right after seeding the README so the document is already queryable when Home renders.

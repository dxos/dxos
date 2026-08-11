---
'@dxos/plugin-onboarding': patch
---

First run opens the README document again instead of the space Home node. The Home welcome panel resolves the default space through the settings-space designation, which is not readable during identity bootstrap, so landing on Home greeted a new user with an empty page. Navigation now happens in plugin-onboarding right after it seeds the README; plugin-support's on-create-space handler is removed.

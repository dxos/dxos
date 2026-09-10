---
'@dxos/ui-theme': patch
---

`@tailwindcss/postcss` and `@tailwindcss/vite` now resolve to the same Tailwind version. Both are direct dependencies and Tailwind ships them in lockstep, so the previous caret ranges let them drift apart.

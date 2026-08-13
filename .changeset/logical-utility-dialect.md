---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

Replace the dead `bs-*`/`is-*`/`pli-*`/`plb-*`/`mli-*`/`mlb-*`/`pis-*`/`pie-*` Tailwind classes with their physical equivalents; they came from `tailwindcss-logical`, removed in the Tailwind v4 migration, and had been generating no CSS.

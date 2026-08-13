---
'@dxos/plugin-connector': patch
'@dxos/plugin-routine': patch
---

The headless (`workerd`) plugin variants no longer import their `#capabilities` barrel. That barrel declares `ReactSurface`, and a bundler follows the dynamic import behind a lazy capability, so a worker bundle that reached either plugin pulled in the React surface and failed on the `.pcss` assets behind it — `@dxos/plugin-google/operations` reaching `plugin-inbox` → `plugin-connector` → `plugin-routine` was enough to break the edge operation-service build. Both variants now import their capability modules directly, as plugin-projects already did.

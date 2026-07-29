---
'@dxos/halo': patch
'@dxos/plugin-client': patch
---

Publish the HALO Effect service packages (`@dxos/halo`, `@dxos/halo-adapter-client`, `@dxos/halo-react`) and begin migrating Composer/plugins off direct `@dxos/client` HALO access onto them: `plugin-client` now provides `Identity.Service` / `Space.Service` layer specs and wraps the app in `HaloProvider`.

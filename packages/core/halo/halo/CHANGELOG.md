# @dxos/halo

## 0.11.0

### Patch Changes

- 6439417: Publish the HALO Effect service packages (`@dxos/halo`, `@dxos/halo-adapter-client`, `@dxos/halo-react`) and begin migrating Composer/plugins off direct `@dxos/client` HALO access onto them: `plugin-client` now provides `Identity.Service` / `Space.Service` layer specs and wraps the app in `HaloProvider`.
- Updated dependencies [6a03a30]
  - @dxos/keys@0.11.0
  - @dxos/errors@0.11.0

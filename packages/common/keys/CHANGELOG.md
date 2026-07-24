# @dxos/keys

## 0.11.0

### Patch Changes

- 6a03a30: Adopt the triple-slash `echo:///<objectId>` form as the canonical local EID. `EID.make({ entityId })` now emits `echo:///<id>`, and `EID.parse` normalizes the legacy single-slash `echo:/<id>` form to it so legacy and freshly-produced EIDs compare equal. The legacy form is still accepted on read.
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0

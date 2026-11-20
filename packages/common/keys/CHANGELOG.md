# @dxos/keys

## 0.17.0

### Minor Changes

- 3aef671: A DXN can end in an ECHO object mnemonic, `dxn:<nsid>[:<version>][#<mnemonic>]`, read and set with `DXN.getMnemonic`, `DXN.withMnemonic` and `DXN.withoutMnemonic`; `DXN.make` never adds one. Features take a `meta.key` and are cited from code as `dxn:<meta.key>#<mnemonic>` in a `@feature` JSDoc tag: the `scan-feature-links` script collects the tags, the `importFeatureLinks` operation stores them on each feature, and the feature map shows each feature's DXN and the tests and code that cite it.

### Patch Changes

- 768db81: A connection sync that starts on EDGE before the client's new connection or binding has replicated there now waits for it, instead of finishing with nothing synced until the next scheduled run. `Binding.loadReplicated` loads such an object with a short retry in the run, then runs the operation again; it gives up once the object is several minutes old. A force-run of a remote trigger now carries the fire event's `data` to EDGE, so the pressed binding is synced first there too.
- @dxos/debug@0.17.0
  - @dxos/invariant@0.17.0
  - @dxos/node-std@0.17.0

## 0.16.0

### Patch Changes

- @dxos/debug@0.16.0
  - @dxos/invariant@0.16.0
  - @dxos/node-std@0.16.0

## 0.15.0

### Patch Changes

- @dxos/debug@0.15.0
  - @dxos/invariant@0.15.0
  - @dxos/node-std@0.15.0

## 0.14.0

### Patch Changes

- @dxos/debug@0.14.0
  - @dxos/invariant@0.14.0
  - @dxos/node-std@0.14.0

## 0.13.0

### Patch Changes

- @dxos/debug@0.13.0
  - @dxos/invariant@0.13.0
  - @dxos/node-std@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [56276cd]
- Updated dependencies [4da1052]
  - @dxos/debug@0.12.0
  - @dxos/node-std@0.12.0
  - @dxos/invariant@0.12.0

## 0.11.1

### Patch Changes

- @dxos/debug@0.11.1
- @dxos/invariant@0.11.1
- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- 6a03a30: Adopt the triple-slash `echo:///<objectId>` form as the canonical local EID. `EID.make({ entityId })` now emits `echo:///<id>`, and `EID.parse` normalizes the legacy single-slash `echo:/<id>` form to it so legacy and freshly-produced EIDs compare equal. The legacy form is still accepted on read.
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/node-std@0.11.0

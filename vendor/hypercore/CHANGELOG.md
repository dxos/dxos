# @dxos/vendor-hypercore

## 0.17.0

### Patch Changes

- @dxos/node-std@0.17.0

## 0.16.0

### Patch Changes

- @dxos/node-std@0.16.0

## 0.15.0

### Patch Changes

- c5def76: hypercore's bitfield pagers no longer preallocate 32,768 slots per level: each feed's four pagers cost 128 KB apiece in V8 and 256 KB in JSC however few pages they held, which on a profile with ~120 feeds was 62 MB of the ECHO worker's heap.
- @dxos/node-std@0.15.0

## 0.14.0

### Patch Changes

- @dxos/node-std@0.14.0

## 0.13.0

### Patch Changes

- @dxos/node-std@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [4da1052]
  - @dxos/node-std@0.12.0

## 0.11.1

### Patch Changes

- @dxos/node-std@0.11.1

## 0.11.0

### Patch Changes

- @dxos/node-std@0.11.0

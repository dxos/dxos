# @dxos/worker-framework

## 1.0.0

### Patch Changes

- @dxos/async@1.0.0
- @dxos/context@1.0.0
- @dxos/effect@1.0.0
- @dxos/invariant@1.0.0
- @dxos/log@1.0.0
- @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/context@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- 6ad2084: Worker connections accept an `onPersistentFailure` escalation hook (with a `maxLeaderFailures` threshold, exposed as `onPersistentWorkerFailure` in `createClientServices`), invoked after consecutive leader-session failures so apps can surface or recover from a stuck worker connection instead of backing off silently forever.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0

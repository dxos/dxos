# @dxos/worker-framework

## 0.11.0

### Minor Changes

- 6ad2084: Worker connections accept an `onPersistentFailure` escalation hook (with a `maxLeaderFailures` threshold, exposed as `onPersistentWorkerFailure` in `createClientServices`), invoked after consecutive leader-session failures so apps can surface or recover from a stuck worker connection instead of backing off silently forever.

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [3f1fc67]
  - @dxos/async@0.11.0
  - @dxos/util@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/log@0.11.0
  - @dxos/invariant@0.11.0

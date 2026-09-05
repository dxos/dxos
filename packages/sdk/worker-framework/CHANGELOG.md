# @dxos/worker-framework

## 0.12.0

### Patch Changes

- 461ce1e: Bound leader-lock stealing so one wedged tab can no longer restart every other tab's worker. A tab whose coordinator link has died never receives a heartbeat, so it judged the (healthy) leader stale and stole the lock on every port timeout — terminating the leader's worker every ~16s indefinitely, and in the worst case failing a boot outright. Steals are now capped per streak (reset on a successful port exchange), escalate once through `onPersistentFailure` when exhausted, and the stealer re-enters election instead of evicting the incumbent and handing the lock straight back. A leader that releases the lock cleanly also re-enters election rather than dropping out of the wait queue for good.
- Updated dependencies [e8088ea]
  - @dxos/util@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/tracing@0.12.0
  - @dxos/errors@0.12.0
  - @dxos/invariant@0.12.0

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

# @dxos/echo-react

## 0.11.0

### Patch Changes

- 9cde1c6: `usePagination`'s `isLoading` now reflects genuine query settlement instead of clearing on the next microtask regardless of delivery, so consumers can reliably distinguish "still loading" from "loaded and empty" even for async, feed-backed queries. The mailbox article uses this to fix a bug where it could briefly flash the wrong empty-state message (e.g. "No connections configured") while a large mailbox's messages were still loading.
- Updated dependencies [4e64123]
- Updated dependencies [46ec569]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [12fd785]
  - @dxos/echo@0.11.0
  - @dxos/log@0.11.0

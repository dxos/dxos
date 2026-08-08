# @dxos/extractor

## 1.0.0

### Patch Changes

- Updated dependencies [3958355]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [7c426d4]
  - @dxos/echo@1.0.0
  - @dxos/compute@1.0.0
  - @dxos/ai@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1
- @dxos/compute@0.11.1
- @dxos/echo@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/types@0.11.1

## 0.11.0

### Minor Changes

- 0a4bbde: One identity rule per type, shared by the extractor's create-vs-merge decision and by a new duplicate scan, plus a Duplicates tab on the database type article for reviewing and merging what has already accumulated.

  Contact extraction is now an allow-list: a sender earns a Person only when we sent or replied to it, or its domain matches a known Organization, and never when the address or message is automated. Mail sync and Google Contacts sync resolve against one index per space rather than a snapshot each, so concurrent syncs no longer both create the same person.

### Patch Changes

- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [46ec569]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a19443b]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [d547045]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [6067460]
- Updated dependencies [12fd785]
- Updated dependencies [f7d7735]
- Updated dependencies [5f08a6a]
- Updated dependencies [3761762]
- Updated dependencies [bdf9f68]
- Updated dependencies [4bb7e3b]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [ac51564]
  - @dxos/echo@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/types@0.11.0
  - @dxos/log@0.11.0
  - @dxos/ai@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0

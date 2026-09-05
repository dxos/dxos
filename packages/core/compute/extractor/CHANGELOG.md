# @dxos/extractor

## 0.12.0

### Patch Changes

- Updated dependencies [af1c007]
- Updated dependencies [106d38a]
- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [e2eecf2]
- Updated dependencies [2800d03]
- Updated dependencies [0fe00c5]
- Updated dependencies [b8762ef]
- Updated dependencies [b2d5bb2]
- Updated dependencies [75971ad]
- Updated dependencies [3958355]
- Updated dependencies [49aee6c]
- Updated dependencies [ea11703]
- Updated dependencies [a3d45c4]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [1c995c4]
- Updated dependencies [a69d861]
- Updated dependencies [ba08e65]
- Updated dependencies [5fcd238]
- Updated dependencies [5e8878c]
- Updated dependencies [e094f74]
- Updated dependencies [3e02201]
- Updated dependencies [a3b6ef0]
- Updated dependencies [b02fe16]
- Updated dependencies [c439ba0]
- Updated dependencies [6af130f]
- Updated dependencies [2c442f9]
- Updated dependencies [2922d36]
- Updated dependencies [d62a947]
- Updated dependencies [7d000b9]
- Updated dependencies [4c107a2]
- Updated dependencies [b9d72bb]
- Updated dependencies [3e9a10f]
- Updated dependencies [8ea2bf9]
- Updated dependencies [8ca2ac7]
- Updated dependencies [0132aab]
- Updated dependencies [47c8d7e]
- Updated dependencies [10b1239]
- Updated dependencies [5180720]
- Updated dependencies [b600f72]
- Updated dependencies [99e323d]
- Updated dependencies [ea11703]
- Updated dependencies [bcfe4c5]
- Updated dependencies [ebb8f4a]
- Updated dependencies [ca34a80]
- Updated dependencies [24fcadc]
- Updated dependencies [4804da0]
- Updated dependencies [63e500b]
- Updated dependencies [7c426d4]
- Updated dependencies [19f19a2]
- Updated dependencies [256f286]
- Updated dependencies [5b504b4]
- Updated dependencies [d7b0a3b]
- Updated dependencies [1482a3f]
- Updated dependencies [2513a52]
- Updated dependencies [b125655]
- Updated dependencies [f4c2702]
- Updated dependencies [318bbad]
- Updated dependencies [ea11703]
- Updated dependencies [18597fc]
- Updated dependencies [881f900]
- Updated dependencies [72b2984]
- Updated dependencies [32353e6]
- Updated dependencies [559acfa]
- Updated dependencies [5d816a6]
- Updated dependencies [578b543]
- Updated dependencies [78523d2]
- Updated dependencies [40b50c2]
- Updated dependencies [85bdad2]
- Updated dependencies [4a10672]
- Updated dependencies [cc11297]
- Updated dependencies [ff37699]
  - @dxos/echo@0.12.0
  - @dxos/ai@0.12.0
  - @dxos/compute@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0
  - @dxos/keys@0.12.0

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

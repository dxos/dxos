# @dxos/halo-adapter-client

## 0.18.0

### Patch Changes

- @dxos/async@0.18.0
  - @dxos/context@0.18.0
  - @dxos/effect@0.18.0
  - @dxos/keys@0.18.0
  - @dxos/util@0.18.0
  - @dxos/link@0.18.0
  - @dxos/echo-protocol@0.18.0
  - @dxos/credentials@0.18.0
  - @dxos/halo@0.18.0
  - @dxos/protocols@0.18.0
  - @dxos/client@0.18.0
  - @dxos/client-protocol@0.18.0

## 0.17.0

### Patch Changes

- b8e76f9: Peers' avatars now act on what they view. Clicking an avatar opens the object's viewers with that row highlighted, each with Go to (open the object where the peer has it open in the tree, such as under a collection) or Jump (reveal the peer's selection or viewport, once the object is open). A peer with the object open in several tabs or on several devices is one row whose Jump goes to the session that moved last; a toggle in the list's toolbar lists their sessions under it, each named by its device ("Chrome on macOS"), with a dot for whether it moved in the last minute. A "See everyone in this space" button opens a Members companion listing every online peer by the object they view. Revealing an anchor moved from `CommentConfig.scrollToAnchor` to a per-type `AppCapabilities.Locator`, and `LayoutOperation.ScrollIntoView` drops `cursor`. New devices no longer get a placeholder label, and `getDeviceLabel` (from `@dxos/client/halo`) treats the old placeholders as no label, so devices are named from their platform and OS. A graph node that leaves and comes back, such as a peer who visits Settings, is expanded again, so its row keeps Go to and Jump. Jump goes to a peer's caret only once they have placed one, otherwise to the top of their viewport, and the avatars open the viewers list from the keyboard too.
- Updated dependencies [a458aef]
- Updated dependencies [d338edb]
- Updated dependencies [782ee41]
- Updated dependencies [d7dc2fc]
- Updated dependencies [04d5fb1]
- Updated dependencies [034e231]
- Updated dependencies [66304b6]
- Updated dependencies [500360c]
- Updated dependencies [908c301]
- Updated dependencies [d95ffc3]
- Updated dependencies [78e96da]
- Updated dependencies [5b4830e]
- Updated dependencies [3aef671]
- Updated dependencies [22f759a]
- Updated dependencies [ece15ab]
- Updated dependencies [9471682]
- Updated dependencies [0d3e4cf]
- Updated dependencies [2f4eb26]
- Updated dependencies [c9c3867]
- Updated dependencies [3d06043]
- Updated dependencies [b8e76f9]
- Updated dependencies [97de470]
- Updated dependencies [768db81]
- Updated dependencies [e50d1e5]
  - @dxos/protocols@0.17.0
  - @dxos/client@0.17.0
  - @dxos/context@0.17.0
  - @dxos/keys@0.17.0
  - @dxos/halo@0.17.0
  - @dxos/client-protocol@0.17.0
  - @dxos/link@0.17.0
  - @dxos/util@0.17.0
  - @dxos/async@0.17.0
  - @dxos/echo-protocol@0.17.0
  - @dxos/credentials@0.17.0
  - @dxos/effect@0.17.0

## 0.16.0

### Patch Changes

- Updated dependencies [4007fa2]
  - @dxos/echo-protocol@0.16.0
  - @dxos/client@0.16.0
  - @dxos/link@0.16.0
  - @dxos/client-protocol@0.16.0
  - @dxos/halo@0.16.0
  - @dxos/async@0.16.0
  - @dxos/context@0.16.0
  - @dxos/effect@0.16.0
  - @dxos/keys@0.16.0
  - @dxos/util@0.16.0
  - @dxos/protocols@0.16.0

## 0.15.0

### Patch Changes

- Updated dependencies [d0728d8]
- Updated dependencies [0420f87]
- Updated dependencies [45ab961]
- Updated dependencies [1e9c017]
- Updated dependencies [ef9aea9]
- Updated dependencies [ce8f092]
- Updated dependencies [37edd53]
  - @dxos/echo-protocol@0.15.0
  - @dxos/protocols@0.15.0
  - @dxos/link@0.15.0
  - @dxos/async@0.15.0
  - @dxos/client@0.15.0
  - @dxos/client-protocol@0.15.0
  - @dxos/halo@0.15.0
  - @dxos/effect@0.15.0
  - @dxos/util@0.15.0
  - @dxos/context@0.15.0
  - @dxos/keys@0.15.0

## 0.14.0

### Patch Changes

- Updated dependencies [1819960]
  - @dxos/effect@0.14.0
  - @dxos/client@0.14.0
  - @dxos/link@0.14.0
  - @dxos/client-protocol@0.14.0
  - @dxos/echo-protocol@0.14.0
  - @dxos/protocols@0.14.0
  - @dxos/halo@0.14.0
  - @dxos/async@0.14.0
  - @dxos/context@0.14.0
  - @dxos/keys@0.14.0
  - @dxos/util@0.14.0

## 0.13.0

### Patch Changes

- Updated dependencies [cb1e218]
- Updated dependencies [8980a93]
- Updated dependencies [e99ee70]
- Updated dependencies [1894fc1]
  - @dxos/util@0.13.0
  - @dxos/client@0.13.0
  - @dxos/link@0.13.0
  - @dxos/client-protocol@0.13.0
  - @dxos/async@0.13.0
  - @dxos/context@0.13.0
  - @dxos/effect@0.13.0
  - @dxos/echo-protocol@0.13.0
  - @dxos/protocols@0.13.0
  - @dxos/halo@0.13.0
  - @dxos/keys@0.13.0

## 0.12.0

### Patch Changes

- Updated dependencies [86d1482]
- Updated dependencies [4ececc6]
- Updated dependencies [3c7b013]
- Updated dependencies [fd873d2]
- Updated dependencies [6388838]
- Updated dependencies [592b00e]
- Updated dependencies [3b78bb6]
- Updated dependencies [e954c0f]
- Updated dependencies [9ef5485]
- Updated dependencies [22bea85]
- Updated dependencies [a069511]
- Updated dependencies [066b35d]
- Updated dependencies [5df602e]
- Updated dependencies [b4ceea2]
- Updated dependencies [bdb02cd]
- Updated dependencies [48eb05d]
- Updated dependencies [73daef4]
- Updated dependencies [fd23a8b]
- Updated dependencies [4e417e9]
- Updated dependencies [577b434]
- Updated dependencies [7d04444]
- Updated dependencies [194b1d3]
- Updated dependencies [881f900]
- Updated dependencies [23d2d8c]
- Updated dependencies [472ca95]
- Updated dependencies [e56276b]
- Updated dependencies [967b130]
- Updated dependencies [75d9c7c]
- Updated dependencies [0ef896f]
- Updated dependencies [777d24a]
- Updated dependencies [48fd9fe]
- Updated dependencies [882ac2a]
- Updated dependencies [a74e9b0]
- Updated dependencies [3ea0b0f]
- Updated dependencies [608a172]
- Updated dependencies [6328de3]
- Updated dependencies [ce194c0]
- Updated dependencies [9d2466a]
- Updated dependencies [df22dec]
- Updated dependencies [b1bb838]
- Updated dependencies [5959b41]
- Updated dependencies [139a3b0]
- Updated dependencies [a5dfa5e]
- Updated dependencies [4689d66]
- Updated dependencies [e207c68]
- Updated dependencies [c4188a6]
- Updated dependencies [4663f24]
- Updated dependencies [2896a58]
- Updated dependencies [9996125]
- Updated dependencies [9e91762]
- Updated dependencies [2df0297]
- Updated dependencies [3e08678]
- Updated dependencies [dd039d2]
- Updated dependencies [adcad97]
- Updated dependencies [f8bfba0]
- Updated dependencies [56276cd]
- Updated dependencies [0280a6a]
- Updated dependencies [e8088ea]
- Updated dependencies [1a3de22]
- Updated dependencies [85e6347]
- Updated dependencies [6dadb41]
  - @dxos/client@0.12.0
  - @dxos/echo-protocol@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/protocols@0.12.0
  - @dxos/link@0.12.0
  - @dxos/client-protocol@0.12.0
  - @dxos/util@0.12.0
  - @dxos/halo@0.12.0
  - @dxos/async@0.12.0
  - @dxos/context@0.12.0
  - @dxos/keys@0.12.0

## 0.11.1

### Patch Changes

- @dxos/async@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/halo@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/protocols@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [aea1e6e]
- Updated dependencies [eec72c5]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [856c4f0]
- Updated dependencies [6a03a30]
- Updated dependencies [6439417]
- Updated dependencies [410a019]
- Updated dependencies [c727a43]
- Updated dependencies [d547045]
- Updated dependencies [114fb98]
- Updated dependencies [b591791]
- Updated dependencies [f15c632]
- Updated dependencies [c727a43]
- Updated dependencies [08a3eea]
  - @dxos/async@0.11.0
  - @dxos/client@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/invariant@0.11.0

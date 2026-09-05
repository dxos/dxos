# @dxos/plugin-payments

## 0.12.0

### Minor Changes

- 777d24a: `Identity.getEdgeIdentity()` returns the signed-in identity as an EDGE/Hub authentication principal — `Option<EdgeIdentity>` carrying the DID, the local device's peer key, and the `presentCredentials({ challenge })` signer that EDGE's `401` verifiable-presentation handshake requires. It is structurally the `EdgeIdentity` of `@dxos/edge-client`, so consumers hand it straight to `EdgeHttpClient.setIdentity` or `handleAuthChallenge` without depending on `@dxos/client`. Synchronous, like `getSnapshot`, because every consumer attaches it inside a React effect or an identity-change callback; the signing it defers is the asynchronous part.

  This replaces `createEdgeIdentity(client)` from `@dxos/client/edge` at every non-CLI call site: `plugin-client`'s hub HTTP client, `plugin-assistant`'s EDGE AI model resolver, `plugin-connector`'s coordinator, and `plugin-payments`.

  **Breaking for `@dxos/plugin-payments` consumers:** `getEdgeAuthHeader`, `createEdgeAuthedFetch`, `buyPremium`, and `createStripeCheckout` now take an `Identity.EdgeIdentity` as their first argument instead of a `Client`. The package no longer depends on `@dxos/client` or `@dxos/react-client` at all.

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [86d1482]
- Updated dependencies [96f94c2]
- Updated dependencies [6d52561]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [85ad256]
- Updated dependencies [2d4107f]
- Updated dependencies [c56ba34]
- Updated dependencies [069e8ed]
- Updated dependencies [7becabf]
- Updated dependencies [73daef4]
- Updated dependencies [fee7666]
- Updated dependencies [d194929]
- Updated dependencies [557e243]
- Updated dependencies [5305365]
- Updated dependencies [a09e18e]
- Updated dependencies [881f900]
- Updated dependencies [6d28380]
- Updated dependencies [dbff1e4]
- Updated dependencies [3ee20ca]
- Updated dependencies [23d2d8c]
- Updated dependencies [b0953f0]
- Updated dependencies [375b863]
- Updated dependencies [3e02201]
- Updated dependencies [dde6714]
- Updated dependencies [b02fe16]
- Updated dependencies [cafa240]
- Updated dependencies [813069c]
- Updated dependencies [9477170]
- Updated dependencies [0ef896f]
- Updated dependencies [777d24a]
- Updated dependencies [48fd9fe]
- Updated dependencies [5ceaf9c]
- Updated dependencies [48ea128]
- Updated dependencies [2c06e2e]
- Updated dependencies [098a0bb]
- Updated dependencies [a74e9b0]
- Updated dependencies [9c86066]
- Updated dependencies [cc45381]
- Updated dependencies [df0ab57]
- Updated dependencies [557e243]
- Updated dependencies [ca34a80]
- Updated dependencies [29543ca]
- Updated dependencies [e26af7e]
- Updated dependencies [ab79741]
- Updated dependencies [77a2d34]
- Updated dependencies [61fe676]
- Updated dependencies [d4b4919]
- Updated dependencies [63e500b]
- Updated dependencies [1ab4bb8]
- Updated dependencies [32468c3]
- Updated dependencies [0a3e9dd]
- Updated dependencies [256f286]
- Updated dependencies [306f50d]
- Updated dependencies [1d6f730]
- Updated dependencies [10defed]
- Updated dependencies [9e91762]
- Updated dependencies [dea5df9]
- Updated dependencies [318bbad]
- Updated dependencies [fc83abd]
- Updated dependencies [efa7836]
- Updated dependencies [678ba58]
- Updated dependencies [8904184]
- Updated dependencies [a805212]
- Updated dependencies [e288833]
- Updated dependencies [886453b]
- Updated dependencies [0280a6a]
- Updated dependencies [63629c5]
- Updated dependencies [e8088ea]
- Updated dependencies [bb94124]
- Updated dependencies [f9816c0]
- Updated dependencies [4a10672]
- Updated dependencies [ee180f6]
  - @dxos/app-framework@0.12.0
  - @dxos/app-toolkit@0.12.0
  - @dxos/client@0.12.0
  - @dxos/react-ui@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/react-ui-form@0.12.0
  - @dxos/edge-client@0.12.0
  - @dxos/halo@0.12.0
  - @dxos/util@0.12.0
  - @dxos/effect@0.12.0
  - @dxos/log@0.12.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/client@0.11.1
- @dxos/credentials@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/effect@0.11.1
- @dxos/invariant@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [e0e1a9f]
- Updated dependencies [5b05d75]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [2fe5a7a]
- Updated dependencies [717edc0]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [30ae5eb]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9f7d5ad]
- Updated dependencies [717edc0]
- Updated dependencies [51aaffe]
- Updated dependencies [d547045]
- Updated dependencies [f10b1ce]
- Updated dependencies [717edc0]
- Updated dependencies [37874ce]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [ed992c2]
- Updated dependencies [08a3eea]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [5585ec8]
- Updated dependencies [499dde4]
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/client@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/credentials@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/invariant@0.11.0

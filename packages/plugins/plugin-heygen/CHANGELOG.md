# @dxos/plugin-heygen

## 0.12.0

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [3958355]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [678ba58]
  - @dxos/app-framework@1.0.0
  - @dxos/app-toolkit@1.0.0
  - @dxos/echo@1.0.0
  - @dxos/plugin-connector@0.12.0
  - @dxos/plugin-studio@0.12.0
  - @dxos/link@1.0.0
  - @dxos/echo-react@1.0.0
  - @dxos/react-ui-form@1.0.0
  - @dxos/edge-client@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/log@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/edge-client@0.11.1
- @dxos/invariant@0.11.1
- @dxos/link@0.11.1
- @dxos/log@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-connector@0.11.1
- @dxos/plugin-studio@0.11.1

## 0.11.0

### Patch Changes

- 277e365: HeyGen avatar/voice pickers now list only the account's own assets (`/v3/avatars?ownership=private`, `/v3/voices?type=private`) instead of HeyGen's public catalog, with names trimmed (HeyGen returns user-named assets with leading newlines / non-breaking spaces) and sorted alphabetically; list requests are bounded by a timeout so a slow response can't hang the picker. `Listbox.ItemContent` no longer reserves the leading icon column when no `icon` is set, so icon-less rows are flush to the edge instead of indented.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [9da013f]
- Updated dependencies [c3625d3]
- Updated dependencies [48d168e]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [68e61ca]
- Updated dependencies [3f1fc67]
- Updated dependencies [2048cb3]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [30ae5eb]
- Updated dependencies [2543b63]
- Updated dependencies [6d2afe0]
- Updated dependencies [f6a01e3]
- Updated dependencies [9cde1c6]
- Updated dependencies [0d1f866]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [9f7d5ad]
- Updated dependencies [12fd785]
- Updated dependencies [f10b1ce]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [848ba1b]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [4bb7e3b]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [08a3eea]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/plugin-connector@0.11.0
  - @dxos/link@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/util@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/edge-client@0.11.0
  - @dxos/plugin-studio@0.11.0
  - @dxos/invariant@0.11.0

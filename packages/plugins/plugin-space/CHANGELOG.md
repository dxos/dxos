# @dxos/plugin-space

## 0.12.0

### Minor Changes

- 678ba58: App configuration moves out of the personal space and into a dedicated **settings space**, and the personal space becomes an ordinary space.

  The settings space is tagged `org.dxos.space.settings`, locked at genesis so it can never be shared, EDGE-replicated so it follows the user across devices, and hidden from the navtree. It holds the cross-space navtree ordering, the Welcome-dismissed flag, and a new **personal space** setting that stores the id of the space to use as the default target for unscoped content (quick entry, chat, preview and entity lookup). That setting can be repointed at any space from Settings → Your spaces.

  A one-time migration runs on `SpacesReady`: it creates the settings space if absent, copies the space ordering across, designates the existing personal space, and stamps `Personal` into that space's `properties.name` (the display name used to come from a translation).

  `AppSpace.PERSONAL_SPACE_TAG` is deprecated — new profiles no longer set it, and it resolves legacy profiles only. `isPersonalSpace`, `setPersonalSpace` and `resolvePersonalSpace` are renamed to `isLegacyPersonalSpace`, `setLegacyPersonalSpace` and `resolveLegacyPersonalSpace`; `getPersonalSpace` keeps its name but now resolves the setting first. New: `SETTINGS_SPACE_TAG`, `isSettingsSpace`, `getSettingsSpace`, `readPersonalSpaceId`, `setPersonalSpaceId`.

  The space creation dialog gains a **Private space** toggle (default off, ahead of the EDGE replication toggle) which locks membership at genesis. Space sharing UI now keys off `space.membershipPolicy` rather than the personal-space tag, so the Members panel is hidden for any private space, not just the personal one. Renaming, re-iconing and deleting the personal space are no longer blocked, except that the space currently designated as personal still cannot be deleted.

  `HelpOperation.HideWelcome` no longer takes a `space` — the flag is app-wide. It is not migrated, so a dismissed welcome carousel reappears once.

### Patch Changes

- Updated dependencies [0280a6a]
- Updated dependencies [4a0b78b]
- Updated dependencies [34a8433]
- Updated dependencies [3958355]
- Updated dependencies [557e243]
- Updated dependencies [da37a13]
- Updated dependencies [0a01ff7]
- Updated dependencies [b600f72]
- Updated dependencies [bcfe4c5]
- Updated dependencies [4f760ce]
- Updated dependencies [557e243]
- Updated dependencies [7c426d4]
- Updated dependencies [678ba58]
- Updated dependencies [0280a6a]
  - @dxos/app-framework@1.0.0
  - @dxos/app-toolkit@1.0.0
  - @dxos/react-ui-dashboard@1.0.0
  - @dxos/echo@1.0.0
  - @dxos/react-ui@1.0.0
  - @dxos/react-ui-menu@1.0.0
  - @dxos/compute@1.0.0
  - @dxos/client@1.0.0
  - @dxos/cli-util@1.0.0
  - @dxos/plugin-attention@0.12.0
  - @dxos/plugin-client@0.12.0
  - @dxos/plugin-graph@0.12.0
  - @dxos/plugin-observability@0.12.0
  - @dxos/plugin-settings@0.12.0
  - @dxos/plugin-status-bar@0.12.0
  - @dxos/extractor@1.0.0
  - @dxos/echo-client@1.0.0
  - @dxos/echo-react@1.0.0
  - @dxos/client-protocol@1.0.0
  - @dxos/migrations@1.0.0
  - @dxos/react-client@1.0.0
  - @dxos/schema@1.0.0
  - @dxos/types@1.0.0
  - @dxos/react-ui-components@1.0.0
  - @dxos/react-ui-form@1.0.0
  - @dxos/react-ui-list@1.0.0
  - @dxos/react-ui-mosaic@1.0.0
  - @dxos/react-ui-search@1.0.0
  - @dxos/react-ui-table@1.0.0
  - @dxos/shell@1.0.0
  - @dxos/react-ui-attention@1.0.0
  - @dxos/react-ui-dnd@1.0.0
  - @dxos/react-ui-masonry@1.0.0
  - @dxos/react-ui-pickers@1.0.0
  - @dxos/react-ui-tabs@1.0.0
  - @dxos/async@1.0.0
  - @dxos/context@1.0.0
  - @dxos/display-name@1.0.0
  - @dxos/effect@1.0.0
  - @dxos/errors@1.0.0
  - @dxos/halo@1.0.0
  - @dxos/halo-react@1.0.0
  - @dxos/invariant@1.0.0
  - @dxos/keys@1.0.0
  - @dxos/log@1.0.0
  - @dxos/protocols@1.0.0
  - @dxos/ui-theme@1.0.0
  - @dxos/ui-types@1.0.0
  - @dxos/util@1.0.0

## 0.11.1

### Patch Changes

- @dxos/app-framework@0.11.1
- @dxos/app-toolkit@0.11.1
- @dxos/async@0.11.1
- @dxos/cli-util@0.11.1
- @dxos/client@0.11.1
- @dxos/client-protocol@0.11.1
- @dxos/compute@0.11.1
- @dxos/context@0.11.1
- @dxos/display-name@0.11.1
- @dxos/echo@0.11.1
- @dxos/echo-client@0.11.1
- @dxos/echo-react@0.11.1
- @dxos/effect@0.11.1
- @dxos/errors@0.11.1
- @dxos/extractor@0.11.1
- @dxos/halo@0.11.1
- @dxos/halo-react@0.11.1
- @dxos/invariant@0.11.1
- @dxos/keys@0.11.1
- @dxos/log@0.11.1
- @dxos/migrations@0.11.1
- @dxos/protocols@0.11.1
- @dxos/react-client@0.11.1
- @dxos/react-ui@0.11.1
- @dxos/react-ui-attention@0.11.1
- @dxos/react-ui-components@0.11.1
- @dxos/react-ui-dashboard@0.11.1
- @dxos/react-ui-dnd@0.11.1
- @dxos/react-ui-form@0.11.1
- @dxos/react-ui-list@0.11.1
- @dxos/react-ui-masonry@0.11.1
- @dxos/react-ui-menu@0.11.1
- @dxos/react-ui-mosaic@0.11.1
- @dxos/react-ui-pickers@0.11.1
- @dxos/react-ui-search@0.11.1
- @dxos/react-ui-table@0.11.1
- @dxos/react-ui-tabs@0.11.1
- @dxos/schema@0.11.1
- @dxos/shell@0.11.1
- @dxos/types@0.11.1
- @dxos/ui-theme@0.11.1
- @dxos/ui-types@0.11.1
- @dxos/util@0.11.1
- @dxos/plugin-attention@0.11.1
- @dxos/plugin-client@0.11.1
- @dxos/plugin-graph@0.11.1
- @dxos/plugin-observability@0.11.1
- @dxos/plugin-settings@0.11.1
- @dxos/plugin-status-bar@0.11.1

## 0.11.0

### Minor Changes

- 179afc6: Add `dx space export` and `dx space import` commands. Export writes a space archive to disk in either the binary storage-dump format (includes document history) or a JSON snapshot of current object state; import reads an archive of either format back as a new space.

### Patch Changes

- 51aaffe: Rename `Message.Content` to `Message.Body` and add a new optional `Message.Content` wrapper that carries the message's default padding. `Card.Root` accepts a `gutter` prop so a card whose body is a form insets its fields like a standalone form.
- 25272e3: Keep the sync status indicator a single colour in every state; the icon and label continue to convey status.
- 0e3a1a9: Distinguish a stalled replication from a lost EDGE connection in the sync status indicator, and stop reporting a stall while replication is still making progress.
- Updated dependencies [f9ba47a]
- Updated dependencies [4e64123]
- Updated dependencies [c035062]
- Updated dependencies [aea1e6e]
- Updated dependencies [9da013f]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [5b05d75]
- Updated dependencies [b5ecf54]
- Updated dependencies [3f6ac61]
- Updated dependencies [091ebe4]
- Updated dependencies [a77e1a2]
- Updated dependencies [eec72c5]
- Updated dependencies [ed992c2]
- Updated dependencies [e510f3b]
- Updated dependencies [ed992c2]
- Updated dependencies [a83d98a]
- Updated dependencies [fe63f19]
- Updated dependencies [a19443b]
- Updated dependencies [3f1fc67]
- Updated dependencies [6df314a]
- Updated dependencies [962c8cd]
- Updated dependencies [2048cb3]
- Updated dependencies [856c4f0]
- Updated dependencies [382d00d]
- Updated dependencies [382d00d]
- Updated dependencies [46ec569]
- Updated dependencies [f8637f1]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [6a03a30]
- Updated dependencies [2fe5a7a]
- Updated dependencies [7b270f2]
- Updated dependencies [7b270f2]
- Updated dependencies [af5fbf4]
- Updated dependencies [717edc0]
- Updated dependencies [d547045]
- Updated dependencies [6439417]
- Updated dependencies [277e365]
- Updated dependencies [ba7aabf]
- Updated dependencies [410a019]
- Updated dependencies [d958118]
- Updated dependencies [2a68c3b]
- Updated dependencies [30ae5eb]
- Updated dependencies [6d2afe0]
- Updated dependencies [e65432c]
- Updated dependencies [f6a01e3]
- Updated dependencies [c9651f1]
- Updated dependencies [9cde1c6]
- Updated dependencies [5e7839e]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [c727a43]
- Updated dependencies [9f7d5ad]
- Updated dependencies [9ded6b9]
- Updated dependencies [6067460]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [51aaffe]
- Updated dependencies [801b77f]
- Updated dependencies [d547045]
- Updated dependencies [bda1a02]
- Updated dependencies [0a4bbde]
- Updated dependencies [832d150]
- Updated dependencies [aea1e6e]
- Updated dependencies [f10b1ce]
- Updated dependencies [f7d7735]
- Updated dependencies [717edc0]
- Updated dependencies [5f08a6a]
- Updated dependencies [114fb98]
- Updated dependencies [37874ce]
- Updated dependencies [b591791]
- Updated dependencies [848ba1b]
- Updated dependencies [f15c632]
- Updated dependencies [3761762]
- Updated dependencies [c9da903]
- Updated dependencies [55bb048]
- Updated dependencies [c727a43]
- Updated dependencies [14848a1]
- Updated dependencies [4bb7e3b]
- Updated dependencies [179afc6]
- Updated dependencies [4df6cf3]
- Updated dependencies [7b270f2]
- Updated dependencies [686fac1]
- Updated dependencies [ed992c2]
- Updated dependencies [105dac4]
- Updated dependencies [96109be]
- Updated dependencies [37c17cc]
- Updated dependencies [f0ec728]
- Updated dependencies [08a3eea]
- Updated dependencies [bb63d91]
- Updated dependencies [ed992c2]
- Updated dependencies [ed992c2]
- Updated dependencies [c58ebb7]
- Updated dependencies [a49131a]
- Updated dependencies [5585ec8]
- Updated dependencies [4f24c4e]
- Updated dependencies [ac51564]
- Updated dependencies [499dde4]
  - @dxos/echo@0.11.0
  - @dxos/async@0.11.0
  - @dxos/schema@0.11.0
  - @dxos/react-ui-list@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/app-toolkit@0.11.0
  - @dxos/plugin-client@0.11.0
  - @dxos/client@0.11.0
  - @dxos/ui-types@0.11.0
  - @dxos/react-ui-search@0.11.0
  - @dxos/echo-client@0.11.0
  - @dxos/compute@0.11.0
  - @dxos/util@0.11.0
  - @dxos/client-protocol@0.11.0
  - @dxos/protocols@0.11.0
  - @dxos/app-framework@0.11.0
  - @dxos/keys@0.11.0
  - @dxos/react-ui-form@0.11.0
  - @dxos/halo@0.11.0
  - @dxos/react-ui-components@0.11.0
  - @dxos/react-ui-attention@0.11.0
  - @dxos/types@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/echo-react@0.11.0
  - @dxos/react-ui-mosaic@0.11.0
  - @dxos/react-ui-masonry@0.11.0
  - @dxos/extractor@0.11.0
  - @dxos/react-client@0.11.0
  - @dxos/shell@0.11.0
  - @dxos/cli-util@0.11.0
  - @dxos/react-ui-tabs@0.11.0
  - @dxos/react-ui-menu@0.11.0
  - @dxos/plugin-status-bar@0.11.0
  - @dxos/migrations@0.11.0
  - @dxos/react-ui-table@0.11.0
  - @dxos/plugin-graph@0.11.0
  - @dxos/plugin-settings@0.11.0
  - @dxos/plugin-attention@0.11.0
  - @dxos/plugin-observability@0.11.0
  - @dxos/react-ui-dashboard@0.11.0
  - @dxos/react-ui-dnd@0.11.0
  - @dxos/react-ui-pickers@0.11.0
  - @dxos/context@0.11.0
  - @dxos/effect@0.11.0
  - @dxos/display-name@0.11.0
  - @dxos/halo-react@0.11.0
  - @dxos/errors@0.11.0
  - @dxos/invariant@0.11.0

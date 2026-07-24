# @dxos/react-ui-list

## 0.11.0

### Patch Changes

- 277e365: HeyGen avatar/voice pickers now list only the account's own assets (`/v3/avatars?ownership=private`, `/v3/voices?type=private`) instead of HeyGen's public catalog, with names trimmed (HeyGen returns user-named assets with leading newlines / non-breaking spaces) and sorted alphabetically; list requests are bounded by a timeout so a slow response can't hang the picker. `Listbox.ItemContent` no longer reserves the leading icon column when no `icon` is set, so icon-less rows are flush to the edge instead of indented.
- 2a68c3b: The conversation view (`MessageArticle`) now renders threads as a Mosaic stack: each message is a tile with its own toolbar, so Reply/Reply All/Forward/AI reply/Delete act on that specific message rather than always targeting the newest one. Body view controls (view mode, load remote images) and collapse-all/expand-all move to a single thread toolbar that applies to the whole conversation, and each message can be individually collapsed to a compact summary. The per-message `Message.Toolbar` no longer includes the view-mode switcher or load-images toggle.

  By default only the most recent message is expanded and the rest are collapsed. Replying to a message now records the specific message it answers (`parentMessage`), so the draft renders directly after that message in the thread rather than always at the bottom, and it is smoothly scrolled fully into view.

  `Listbox.Item` rows with an `onClick` (not just selectable ones) are now keyboard-focusable and respond to Enter/Space, matching native `<button>` activation.

- Updated dependencies [4e64123]
- Updated dependencies [e0e1a9f]
- Updated dependencies [46ec569]
- Updated dependencies [3f1fc67]
- Updated dependencies [46ec569]
- Updated dependencies [b8c0825]
- Updated dependencies [4e64123]
- Updated dependencies [2fe5a7a]
- Updated dependencies [d958118]
- Updated dependencies [923d5be]
- Updated dependencies [85893fe]
- Updated dependencies [717edc0]
- Updated dependencies [12fd785]
- Updated dependencies [4df6cf3]
  - @dxos/echo@0.11.0
  - @dxos/react-ui@0.11.0
  - @dxos/util@0.11.0
  - @dxos/ui-theme@0.11.0
  - @dxos/log@0.11.0
  - @dxos/react-list@0.11.0
  - @dxos/debug@0.11.0
  - @dxos/invariant@0.11.0
  - @dxos/ui-types@0.11.0

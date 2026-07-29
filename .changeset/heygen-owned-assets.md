---
'@dxos/plugin-heygen': patch
'@dxos/react-ui-list': patch
---

HeyGen avatar/voice pickers now list only the account's own assets (`/v3/avatars?ownership=private`, `/v3/voices?type=private`) instead of HeyGen's public catalog, with names trimmed (HeyGen returns user-named assets with leading newlines / non-breaking spaces) and sorted alphabetically; list requests are bounded by a timeout so a slow response can't hang the picker. `Listbox.ItemContent` no longer reserves the leading icon column when no `icon` is set, so icon-less rows are flush to the edge instead of indented.

---
'@dxos/app-toolkit': minor
'@dxos/plugin-markdown': patch
'@dxos/plugin-review': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-space': patch
'@dxos/react-ui-attention': patch
'@dxos/ui-editor': patch
---

Peers' avatars now act on what they view. Clicking an avatar opens the object's viewers with that row highlighted, each with Go to (open the object) or Jump (reveal the peer's selection or viewport, once the object is open). A "See everyone in this space" button opens a Members companion listing every online peer by the object they view. Revealing an anchor moved from `CommentConfig.scrollToAnchor` to a per-type `AppCapabilities.Locator`, and `LayoutOperation.ScrollIntoView` drops `cursor`.

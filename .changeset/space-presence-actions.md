---
'@dxos/app-toolkit': minor
'@dxos/client': patch
'@dxos/plugin-client': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-review': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-space': patch
'@dxos/react-client': patch
'@dxos/react-ui-attention': patch
'@dxos/shell': patch
'@dxos/ui-editor': patch
---

Peers' avatars now act on what they view. Clicking an avatar opens the object's viewers with that row highlighted, each with Go to (open the object) or Jump (reveal the peer's selection or viewport, once the object is open). A peer with the object open in several tabs or on several devices is one row whose Jump goes to the session that moved last; a toggle in the list's toolbar lists their sessions under it, each named by its device ("Chrome on macOS"), with a dot for whether it moved in the last minute. A "See everyone in this space" button opens a Members companion listing every online peer by the object they view. Revealing an anchor moved from `CommentConfig.scrollToAnchor` to a per-type `AppCapabilities.Locator`, and `LayoutOperation.ScrollIntoView` drops `cursor`. New devices no longer get a placeholder label, and `getDeviceLabel` (from `@dxos/client/halo`) treats the old placeholders as no label, so devices are named from their platform and OS.

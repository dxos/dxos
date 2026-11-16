---
'@dxos/app-toolkit': minor
'@dxos/plugin-assistant': patch
'@dxos/plugin-deck': patch
'@dxos/plugin-space': patch
'@dxos/react-ui': minor
'@dxos/react-ui-attention': minor
---

A follower now lands where the leader is scrolled in any article inside a `ScrollArea`, with no follow code in its plugin, and an article comes back where you left it when its plank remounts. Plugins can opt a viewport out with `follow={false}` on `ScrollArea.Viewport`, follow only some fields of a `ViewState` aspect with `follow: { policy: 'write', fields }`, and mark a section with `HomeSection.Root`'s `anchor` so a follower at another width keeps it at the top.

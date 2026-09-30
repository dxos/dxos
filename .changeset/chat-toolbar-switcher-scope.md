---
'@dxos/plugin-assistant': patch
---

`Chat.Toolbar` takes an optional `switcher` naming the chats its history menu lists and what picking one does. The menu previously listed the companion chats of `companionTo` and switched the companion, with no way to scope it to anything else; omitting the prop keeps exactly that behaviour, so companion chats are unchanged.

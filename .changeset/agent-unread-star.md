---
'@dxos/schema': minor
'@dxos/plugin-assistant': minor
---

`SeenAnnotation` marks how far a space has viewed a feed: the cursor of the newest item an open view has shown. `trackSeen` starts tracking a feed from its beginning, `unseenQuery` selects the positioned items after the cursor, and `markSeen` moves the cursor to one of those items, so it only moves forward. In the navtree, a chat whose feed has unseen items, and a companion chat's subject, show a still amber agent star until anyone opens the chat.

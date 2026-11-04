---
'@dxos/assistant': minor
'@dxos/agent-runtime': minor
---

`Chat` records read positions: `turns`, the count of turns the agent has finished, and `seen`, the position each member's open view has reached, by identity DID. `Chat.recordTurn`, `Chat.markSeen` and `Chat.isUnread` read and write them; a chat is unread while its latest turn is past every member's position. `withTurnStatus` records each turn that ends without being stopped, so it works the same wherever the turn runs. In the navtree, an unread chat and a companion chat's subject show a still amber agent star until anyone opens the chat.

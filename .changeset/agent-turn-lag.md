---
'@dxos/echo': patch
---

Less background work while an agent streams into a chat: loading a reference to a database object no longer reads every feed in the space whole (or leaves them subscribed), an index pass started by feed appends alone no longer rescans every document, live queries check deletion only on the objects their filters keep, and entity-id validation no longer goes through a schema decode.

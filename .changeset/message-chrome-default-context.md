---
'@dxos/react-ui-assistant': patch
---

MessageChrome no longer throws when rendered without its provider; the context now defaults to empty so the chrome degrades to its default behavior instead of crashing the thread.

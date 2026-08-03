---
'@dxos/ui-editor': patch
---

Fix XML tag widgets rendering blank after the document is replaced — widget state applied around the reset (for example tool call rows when returning to a chat) now reaches the mounted widget.

---
'@dxos/plugin-atproto': patch
---

Fix the PDS browser rendering an empty body. The collection and record lists had a content-sized width inside Panel and ScrollArea, which are inline-size containers, so the lists collapsed to 0px and nothing could be selected. The list pane now has a fixed width.

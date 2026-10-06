---
'@dxos/ui-editor': patch
---

Scrolling a markdown document does less work per frame: images are decorated as the parser reaches them instead of by re-scanning the whole document on every scroll, and the remembered scroll position is measured once per frame in the editor's own measure phase instead of forcing a layout on every scroll event.

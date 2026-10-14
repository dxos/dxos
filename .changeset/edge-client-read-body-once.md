---
'@dxos/edge-client': patch
---

EDGE HTTP calls read each response body once instead of through a clone. WebKit never frees a cloned response whose other branch goes unread, so in Safari and the desktop app every EDGE response stayed in memory for the life of the page.

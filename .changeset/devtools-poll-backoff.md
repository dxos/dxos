---
'@dxos/devtools': patch
---

The devtools overview polls EDGE far less while open. Indexer heads back off from every 5 s to once a minute, and a status report with issues is re-fetched after a delay that doubles up to a minute instead of every second. Refresh still fetches at once.

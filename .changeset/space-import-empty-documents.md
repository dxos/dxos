---
'@dxos/client-services': patch
---

Space archives that contain an empty document now import instead of failing with an invariant violation, and exports no longer write documents that have no local data. The import dialog shows progress and reports failures as a toast, and GitHub pull request actions rejected with a 401 say to reconnect GitHub and link to the connection.

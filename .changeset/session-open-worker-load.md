---
'@dxos/echo': patch
---

A query of one type over a single feed, such as a chat's messages, now reads only that feed instead of that type across every feed in the space. Retirement and document-list checks no longer decode every directory link on each change, and working-set queries share deletion checks across one scan.

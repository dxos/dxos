---
'@dxos/echo': patch
---

Queries check each shared parent's deletion once per evaluation instead of once per result: the host's deleted-object filter memoizes each strong dependency's verdict for the step. A query over 200 tasks under one project made 200 index lookups for that project on every re-evaluation.

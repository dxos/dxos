---
'@dxos/plugin-debug': patch
---

The Hello Worker sample space names the sandbox's Node constraint in its first task, the way the chess template's Development skill already does: the sandbox runs Node 20, so a plain wrangler install resolves to a version that predates `--temporary`, and an agent working the list discovered that only at deploy time.

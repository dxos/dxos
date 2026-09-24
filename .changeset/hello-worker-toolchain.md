---
'@dxos/plugin-debug': patch
---

The Hello Worker sample space names the sandbox's Node constraint in its first task, the way the chess template's Development skill already does: `wrangler deploy --temporary` needs wrangler 4.102 or later and that wrangler needs Node 22, but the sandbox runs Node 20, so a plain install resolves to the newest release Node 20 allows — which predates the flag. An agent working the list discovered that only at deploy time.

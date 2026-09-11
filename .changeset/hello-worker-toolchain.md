---
'@dxos/plugin-debug': patch
---

The Hello Worker sample space now names the sandbox image's Node constraint in its first task: the image ships Node 20, so `npm i -g wrangler` resolves the last release without `--temporary`, and an agent working the list had to discover and undo that mid-deploy.

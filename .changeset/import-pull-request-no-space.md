---
'@dxos/plugin-github': patch
---

"Import pull request" now says when there is no space to import into, instead of doing nothing at all: the command is reachable from the root, which has no space of its own, so pressing Import with another workspace focused silently returned. The dialog stays open with the typed reference.

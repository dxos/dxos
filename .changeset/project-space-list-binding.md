---
'@dxos/plugin-projects': patch
---

Bind a repo's projects to a list of ECHO spaces with a nominated default, rather than a single space. `.agents/projects/space.yml` now carries `spaces` (every space the repo may write projects to) and `default` (the one used when none is named); a file holding only the older `spaceId` key still works as a one-entry list.

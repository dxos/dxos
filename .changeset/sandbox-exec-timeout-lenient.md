---
# multiple-changesets: found running the chess-MCP eval; the exec schema is plugin-sandbox's, the eval is not
'@dxos/plugin-sandbox': patch
---

`Exec` accepts a quoted number for `timeout` and defaults it to five minutes rather than the service's two, so a model that quotes it or omits it no longer loses an install to a schema rejection or a cut-off.

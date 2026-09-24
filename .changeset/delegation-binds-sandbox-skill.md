---
# multiple-changesets: the chess-MCP eval needs a shell in the delegated session; the binding lives in plugin-projects, the eval elsewhere
'@dxos/plugin-projects': patch
---

A delegated session is bound the sandbox skill alongside planning, markdown and project, so a task that builds or runs something has a shell without the reader enabling one. A key with no plugin behind it binds nothing.

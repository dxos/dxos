---
'@dxos/echo-client': patch
---

Cancel in-flight object loads when a database is torn down, instead of raising an unhandled `RepoProxy` invariant violation.

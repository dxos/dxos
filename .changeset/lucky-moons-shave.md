---
'@dxos/plugin-markdown': patch
---

Importing a public pull request no longer fails because of the space's GitHub connection: a request the stored token could not make is retried anonymously on 403 and 404 as well as 401.

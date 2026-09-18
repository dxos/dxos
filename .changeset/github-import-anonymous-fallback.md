---
'@dxos/plugin-github': patch
---

Importing a pull request no longer fails when a space's GitHub connection holds a token GitHub has
since rejected: the read is retried anonymously, which reaches any public pull request. A pull
request that is genuinely out of reach now says so, naming the connection rather than the reference.

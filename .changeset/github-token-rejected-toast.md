---
'@dxos/plugin-github': patch
---

A pull request action that fails because GitHub rejected the space's connection token now says so
and points at reconnecting, instead of surfacing the raw HTTP error. A `401` reached the toast as
`StatusCode: non 2xx status code (401 GET https://api.github.com/...)`, which named neither the
cause nor anything the user could do about it.

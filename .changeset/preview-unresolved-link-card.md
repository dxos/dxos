---
'@dxos/plugin-preview': patch
---

Hovering a link chip that a resolver recognises but cannot fetch (a GitHub pull request in a private repository the space holds no token for, an object that no longer exists) now opens its card, titled with the link's short name and saying there is no preview, instead of doing nothing.

---
'@dxos/edge-client': patch
---

`EdgeClient` now closes a connection attempt that times out, and any connection it has replaced. A slow reconnect could leave such a socket open, and once EDGE admitted it after the live one, every reply went to the socket the client ignores until the page reloaded.

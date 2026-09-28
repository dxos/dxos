---
'@dxos/echo-host': patch
---

A document that sync has to bring up to date now stays loaded until its sync round lands, so a slow peer no longer leaves it on an older copy for good. `EdgeClient` also closes connection attempts that time out and connections it has replaced, so EDGE can no longer deliver its replies to a socket the client ignores.

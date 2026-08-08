---
'@dxos/echo': patch
---

`AppSpace.setupIdentitySpaces` now creates the content space before the settings space, so a new profile's default space is `client.spaces[0]` rather than the internal settings space.

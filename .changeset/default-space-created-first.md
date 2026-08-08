---
'@dxos/echo': patch
---

`AppSpace.setupIdentitySpaces` now creates the content space before the settings space, so a new profile's default space is the first entry returned by `client.spaces.get()` rather than the internal settings space.

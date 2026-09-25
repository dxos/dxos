---
'@dxos/client-services': patch
'@dxos/plugin-assistant': patch
---

Fix EDGE-configured hosts silently never using their edge client for invitation admission and agent creation, resync stale profile fields when an identity changes elsewhere, subscribe to previously-unwatched ECHO fields across several article surfaces, and replace several hand-rolled list/wrapper divs with the shared Listbox/Flex/Grid primitives.

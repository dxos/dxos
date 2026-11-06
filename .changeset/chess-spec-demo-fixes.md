---
'@dxos/react-ui-canvas': patch
'@dxos/plugin-code': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-review': patch
---

Fixes found while recording a two-person spec demo:

- On a graph canvas, a card laid out into a cell that a placed card holds moves along its row to the next free cell, so the two cards no longer stack.
- `/feature` leaves a bullet's marker out of the feature's description.
- An arrow just drawn on the feature canvas no longer reaches the companion as a selected feature, which failed with "Invalid argument ids".
- A resolved comment thread leaves Active comments as soon as it is resolved, on every peer.
- The feature-map skill writes out a whole spec with one import and gives each requirement line its own id.

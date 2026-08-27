---
'@dxos/edge-client': patch
'@dxos/client-services': patch
'@dxos/echo-host': patch
---

Report a space's root document to edge once the space is anchored.

`EdgeHttpClient` gains `recordSpaceRoot`, which names the automerge document that roots a space.
Edge cannot derive it — a space id is the hash of its space key, and no document id reproduces
that — so without being told, edge never finds the credentials document and the space stays on its
control feed. `DataSpaceManager` calls it as part of anchoring, behind the same
`DX_AUTOMERGE_CREDENTIALS` opt-in; a failed report is logged rather than raised, since anchoring is
local and already complete by then.

The record is write-once on the edge side, so re-anchoring an existing space returns the root
already in force rather than replacing it.

`EchoHost` also enrols the space root and credentials documents in the space's replicated set. They
hang off the space rather than the directory's links, so nothing replicated them and edge could not
read the documents it was being asked to validate.

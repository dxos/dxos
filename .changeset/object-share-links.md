---
'@dxos/client': minor
'@dxos/plugin-space': minor
---

Any Composer object can be shared from a Share dialog with a link that joins the recipient to its space in the background — creating an identity first in a fresh browser — and opens the object as soon as the space appears. `client.spaces.join(invitation, { syncScope })` joins a space replicating only the given objects, and `space.internal.extendSyncScope` widens it; the scope is enforced by the joining client only, not by EDGE or other members. ECHO queries no longer wait for indexing: objects in documents the index has not read yet are read from disk, and a live query updates once the index catches up.

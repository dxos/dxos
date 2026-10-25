---
'@dxos/client': minor
'@dxos/plugin-space': minor
---

Any Composer object can be shared from a Share dialog with a link that joins the recipient to its space in the background — creating an identity first in a fresh browser — and opens the object as soon as the space appears; until then its plank shows the object read-only, as EDGE last indexed it, read with the link's invitation before the recipient has an identity (`EdgeHttpClient.readSharedObjects`, rendered through the new `AppSurface.PendingArticle` and `AppSurface.ObjectPreview` roles). `client.spaces.join(invitation, { syncScope })` joins a space replicating only the given objects, `space.internal.extendSyncScope` widens it, and a delegated invitation's `sharedObjectIds` are written beside it as a `DelegatedInvitationScope` credential that EDGE serves them by; the replication scope is enforced by the joining client only, not by EDGE or other members. ECHO queries no longer wait for indexing: objects in documents the index has not read yet are read from disk, and a live query updates once the index catches up.

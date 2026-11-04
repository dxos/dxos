---
'@dxos/client': minor
'@dxos/plugin-space': minor
---

Any Composer object can be shared from a Share dialog with a link that joins the recipient to its space in the background — creating an identity first in a fresh browser — and shows the object before the join completes. The link carries a delegated invitation and the ids of the objects it shares. A client that does not already cache the space reads them from EDGE with a request signed by the invitation's guest key (`EdgeHttpClient.readSharedObjects`) and opens the space from them (`ClientOptions.bootCache.pendingSpaces`, listed as `space.internal.provisional` until the services list it). `InvitationEncoder.toJson`/`fromJson` carry an invitation's shareable fields as JSON, as share links do.

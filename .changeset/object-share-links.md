---
'@dxos/client': minor
'@dxos/plugin-space': minor
---

Any Composer object can be shared from a Share dialog with a link that carries the ids of the objects to replicate first and the plugins that render them. A Restricted link (the default) opens for members of the space only. An "Anyone with the link" link also carries a delegated invitation: it joins the recipient to the space in the background, creating an identity first in a fresh browser, and shows the object before the join completes. A client that does not already cache the space reads those objects from EDGE with a request signed by the invitation's guest key (`EdgeHttpClient.readSharedObjects`) and opens the space from them (`ClientOptions.bootCache.pendingSpaces`, listed as `space.internal.provisional` until the services list it). `client.spaces.syncFirst(spaceId, objectIds)` replicates the documents of some objects before the rest of a space, which need not be joined yet. `InvitationEncoder.toJson`/`fromJson` carry an invitation's shareable fields as JSON, as share links do.

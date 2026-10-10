---
'@dxos/observability': patch
'@dxos/client-services': patch
'@dxos/effect': patch
---

Invitation spans are no longer lost to sampling. Tail sampling now keeps every span marked `dxos.sampling.keep`, and both the host's `handleInvitationFlow` span and the guest's `acceptInvitation` span carry that mark, so short invitation flows are no longer dropped 70% of the time. The host span also records `ctx.outcome` when it ends.

---
'@dxos/client': patch
---

Restore the iframe shell (`shell='./shell.html'`) client-services connection after the effect-rpc migration. The app now re-serves its services to the shell over effect-rpc (matching the shell's `ClientServicesProxy` consumer) instead of the removed protobuf peer, and the shell provides its parent origin upfront so the effect-rpc client can initiate the connection without deadlocking. Fixes apps that embed the external shell iframe hanging on startup.

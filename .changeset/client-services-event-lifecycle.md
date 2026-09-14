---
'@dxos/effect': minor
---

Add an in-process `Event` bus module (`Event.make`, `Event.handler`, `Event.subscribe`, `Event.emit`, `Event.busLayer`) and drive the client-services host lifecycle through it: each stack layer opens its component on the lifecycle event it depends on and closes it in its layer finalizer, replacing the hand-maintained open and close sequences in `ClientServicesHost`. Also fixes a runtime import cycle that left the bundled `@dxos/client-services` unable to build its RPC layer.

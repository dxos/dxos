---
'@dxos/compute-runtime': minor
'@dxos/compute': minor
---

`LayerSpec` takes an `eager` flag, and `LayerStack` builds those specs when a slice initializes rather than waiting for one of their tags to be requested.

Specs are resolved lazily by tag, so a spec whose point is a side effect — registering an rpc service, subscribing to lifecycle events — provides nothing anyone asks for and would never run. `eager: true` builds it (with whatever provides its requirements) as soon as the slice's own requirements are in place, once per slice.

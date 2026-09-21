---
'@dxos/compute-runtime': minor
'@dxos/compute': minor
---

`LayerSpec` takes an `eager` flag, and `LayerStack` builds those specs when a slice initializes rather than waiting for one of their tags to be requested.

Specs are resolved lazily by tag, so a spec whose point is a side effect — registering an rpc service, subscribing to lifecycle events — provides nothing anyone asks for and would never run. `eager: true` builds it (with whatever provides its requirements) as soon as the slice's own requirements are in place, once per slice.

`LayerStack` also disposes a slice's batch runtimes newest first rather than concurrently: a batch materialized later may hold services from an earlier one, and Effect orders finalizers only within a single runtime.

`LayerStack` also accepts ambient `services`: a context the embedder supplies, available to every slice as if a lower-affinity one provided it. The lowest slice has nothing below it, so this is the only way to hand it services it does not build itself; a spec whose ambient requirement is absent is pruned like any other.

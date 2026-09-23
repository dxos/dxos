---
'@dxos/compute-runtime': minor
'@dxos/compute': minor
'@dxos/client-services': minor
'@dxos/client': minor
---

The client services stack is built from `LayerSpec`s aggregated by a `LayerStack`, instead of a hand-written chain of `provideMerge` calls.

Each part of the stack is its own top-level spec declaring the tags it requires and the tags it provides, so build order — and which specs are built at all — follows from the graph. `clientServiceSpecs` is the list of them with the option-driven choices applied, and `makeClientServicesStack` is what every embedder builds: the worker runtime, `LocalClientServices` and the test `ServiceContext`. They reach services through `resolve(tag)` rather than a context of everything.

`LayerSpec` takes an `eager` flag, and `LayerStack` builds those specs when a slice initializes rather than waiting for one of their tags to be requested. Specs are resolved lazily by tag, so a spec whose point is a side effect — registering an rpc service, subscribing to lifecycle events, attaching a replicator — provides nothing anyone asks for and would never run. `eager: true` builds it (with whatever provides its requirements) as soon as the slice's own requirements are in place, once per slice. `LayerStack.init` builds those specs without asking for a tag, which is how an embedder starts a stack whose point is its side effects.

`LayerStack.layer` declares the ambient services as tags rather than taking an opaque `Context`, so the returned layer requires exactly those tags and a missing one is a compile error instead of a silently pruned spec. `LayerStack` still accepts ambient `services` directly: a context available to every slice as if a lower-affinity one provided it, which is the only way into the lowest slice.

`LayerStack` also disposes a slice's batch runtimes newest first rather than concurrently: a batch materialized later may hold services from an earlier one, and Effect orders finalizers only within a single runtime.

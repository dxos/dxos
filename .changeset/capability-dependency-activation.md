---
'@dxos/app-framework': minor
'@dxos/plugin-markdown': patch
---

Order module activation by capability dependencies instead of hand-wired events.
A module declares the capabilities it `requires` and `provides` (or a runtime
`activatesOn` event) and the plugin manager topologically orders activation from
that graph. Capabilities are yieldable Effect services, so accessing an undeclared
capability or omitting a declared one is now a type error, and missing providers,
dependency cycles, and duplicate providers fail fast with tagged errors instead of
runtime assertions. Plugins compose as a flat chain of `Plugin.addModule` over
module bodies authored with `Capability.lazyModule` (code-split) or
`Capability.inlineModule` (eager), or with a per-capability maker from the new
`AppCapability` namespace (`surface`, `settings`, `appGraphBuilder`, `translations`,
`schema`, ...) that bakes in the module name and default provides. A module is an
opaque `Capability.Module<Options>`, parameterized only by its options type, so a
module export never leaks a foreign capability's type into declaration emit.

Breaking: the legacy event-wiring API is removed — `AppPlugin` and its
`addXModule` helpers, `firesBeforeActivation`/`firesAfterActivation`, `compatFires`,
and the ordering-only `Setup*`/`*Ready` activation events (genuine runtime events
remain). `Capability.provide`/`provideAll` are renamed to
`Capability.contribute`/`contributeAll`, and the untyped raw builder
`Capability.contributes` is removed. Multi is now the default capability arity:
`Capability.make` defines a multi (registry) capability and
`Capability.makeSingleton` the single-provider case, both curried
(`make<T>()(nsid)`) so the NSID literal brands the identifier. The
`withPluginManager` `capabilities` test option now accepts `Contribution[]`.

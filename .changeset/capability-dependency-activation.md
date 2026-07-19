---
'@dxos/app-framework': minor
---

Replace event-based module activation ordering with capability-dependency
activation: modules declare `requires`/`provides` capabilities (or a runtime
`activatesOn` event) and the plugin manager topologically orders activation
from that graph instead of hand-wired `activatesOn`/`firesBeforeActivation`/
`firesAfterActivation` events. Capabilities are yieldable Effect services, so
accessing an undeclared capability or omitting a declared one is a type
error. This is a breaking change: the legacy `addModule` event-wiring API,
`compatFires`, and the ordering-only activation events have been removed.

Multi is the default capability arity: `Capability.make` defines a multi
(registry) capability and `Capability.makeSingleton` the single-provider case
(previously `makeMulti`/`make`). Plugins compose as a uniform chain of bare
`Plugin.addLazyModule` calls over spec-carrying module bodies — an opaque
`Capability.Module<Options>`, parameterized only by its options type so a
module export never leaks a foreign capability's type into declaration
emit. Bodies are authored via `Capability.lazyModule` (code-split) or
`Capability.inlineModule` (eager), both taking a spec with
`requires`/`provides`/`activatesOn` and an optional `props` mapping from
plugin options to body props; capability owners can also build a maker with
`Capability.moduleMaker`.

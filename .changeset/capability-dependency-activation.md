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

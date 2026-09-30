---
'@dxos/ai': minor
---

`OpaqueToolkit.layer` is typed `Layer<Tool.Handler<any>, E, R>` instead of `Layer<unknown, E, R>`. The `unknown` was meant as opacity but is the top type, so `Effect.provide(toolkit.layer)` discharged every requirement a consumer had rather than only the handler ones; a program missing a service could typecheck. Code that relied on that now reports the missing service.

`OpaqueToolkit.Any` takes optional `E` and `R` parameters (`Any<E = any, R = any>`), so a caller can name the handler layer's failure and requirement channels. Existing `T extends OpaqueToolkit.Any` constraints are unchanged. `createToolkit` is generic in both and returns `OpaqueToolkit<never, E, R>`, so a caller keeps the channels its toolkits declared instead of receiving them widened.

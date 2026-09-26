---
'@dxos/echo': patch
---

An agent no longer fails its whole turn when the between-turn re-read of its context bindings times
out: `AiContext.Binder.sync` keeps the bindings its live query already holds and logs a warning.

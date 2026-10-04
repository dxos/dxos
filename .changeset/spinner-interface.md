---
'@dxos/echo': minor
'@dxos/plugin-markdown': minor
---

Spinners share one interface: `SpinnerProps` with an `ActivityState` of `'ready' | 'thinking' | 'alert' | 'error'`, named by meaning rather than animation. `ShapeSpinner` is the morphing square and `PulseSpinner` a dot matrix (a wave when ready, amber on alert, random pings while thinking, a sweep on error).

**Breaking:** `Spinner` is now `ShapeSpinner`, and its states are renamed (`pulse` → `ready`, `spin` → `thinking`, `flash` → `alert`). `Pulse` moves from `@dxos/react-ui-experimental` to `@dxos/react-ui-components`, and `Matrix` the other way.

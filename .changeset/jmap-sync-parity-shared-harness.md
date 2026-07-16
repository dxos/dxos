---
'@dxos/plugin-inbox': minor
---

Bring JMAP mail sync to feature parity with Gmail — live progress monitor with cancellation, stats-panel telemetry, and failure reporting — and drive both providers through one shared, provider-agnostic sync effect (`runMailSync`) that takes its provider as an Effect service, so each handler is the same run with its own provider layer (API + resolver) provided.

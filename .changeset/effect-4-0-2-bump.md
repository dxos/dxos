---
'@dxos/observability': patch
---

Update `effect` to 4.0.2 and the `@effect/*` packages to 4.0.3. Effect now records the model provider as the `gen_ai.provider.name` span attribute (it was `gen_ai.system`), so `@dxos/observability` reads either attribute and recognizes both as GenAI spans.

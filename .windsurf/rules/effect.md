---
trigger: model_decision
description: Working with the `effect` library.
---

- Prefer passing `this` as the first parameter to `Effect.gen`: `Effect.get(this, function* () { this.foo })`
---
'@dxos/echo': patch
---

Fix a stack overflow when decoding a recursive JSON schema. `toEffectSchema` inlined every `$ref` eagerly, so a self-referential or mutually-recursive schema — the only shapes for which `$defs` are emitted — recursed until the stack blew; a `$ref` now resolves through a memoized suspend. The same cycle is handled when projecting an operation's input schema into LLM-facing tool parameters, so a tool whose parameters reference themselves no longer breaks assistant requests.

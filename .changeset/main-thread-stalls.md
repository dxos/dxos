---
'@dxos/async': patch
'@dxos/plugin-routine': patch
---

Remove main-thread stalls: add `interactive`/`smooth`/`idle` yield strategies to `@dxos/async`, have routine registry sync yield under the `smooth` strategy, and initialize each layer slice under its own lock instead of one stack-wide lock.

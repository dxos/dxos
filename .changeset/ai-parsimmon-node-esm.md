---
'@dxos/ai': patch
---

The vendored Parsimmon shim resolves the CJS module's exports instead of taking its namespace, so
importing `@dxos/ai` no longer throws `TypeError: parsimmon.regexp is not a function` under plain
Node ESM. Parsimmon builds its API dynamically, which leaves `cjs-module-lexer` with no named
exports to detect; Vite's interop hid that, so the crash only surfaced outside a bundler — the
`EDGE nightly` blade-runner plans, run through `node --import tsx`, died on import.

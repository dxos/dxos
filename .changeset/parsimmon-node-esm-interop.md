---
'@dxos/ai': patch
---

The AI stream parser loads under plain Node ESM again. `parsimmon` is CommonJS that assigns its
combinators onto `module.exports`, so a namespace import saw only `default` outside a bundler and
every consumer running on Node — not vite — died at import with `parsimmon.regexp is not a
function`.

---
'@dxos/ai': patch
---

Importing `@dxos/ai` under plain Node no longer throws `TypeError: parsimmon.regexp is not a function`. The parser reached `parsimmon` — CommonJS that hangs every combinator off the exported function — through a namespace import, which Node resolves to a namespace carrying `default` alone; bundlers papered over it, so only consumers running the package unbundled were affected.

---
'@dxos/protobuf-compiler': minor
'@dxos/plugin-code': patch
---

Compile and typecheck with TypeScript 7. TypeScript 7 ships no JavaScript compiler API, so packages that call into it now depend on the `@typescript/typescript6` compatibility package instead of `typescript` — `@dxos/protobuf-compiler` requires it as a peer dependency.

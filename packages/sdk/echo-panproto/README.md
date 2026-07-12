# @dxos/echo-panproto

Declarative ECHO ↔ atproto lexicon transforms, backed by [panproto](https://panproto.dev). Mappings
are authored as **data** (`panproto_expr::Expr` ASTs), executed by panproto's real transform engine.

```ts
import { Panproto } from '@dxos/echo-panproto';

const out = await Panproto.transform({
  lexicon,
  spec: {
    rootVertex: 'echo.book:body',
    fieldTransforms: [
      { vertex: 'echo.book:body', key: 'status', expr: Panproto.prefix('buzz.bookhive.defs#', Panproto.field('status')) },
    ],
  },
  record: { title: 'Dune', status: 'reading' },
});
// out.status === 'buzz.bookhive.defs#reading'
```

## Why a wrapper (and why it's temporary)

panproto's engine executes value transforms, but its shipped npm package `@panproto/core@0.56.1`
**does not expose transform execution through its TypeScript/wasm binding** — `instantiate → get`
and migration `expr_resolvers → lift` both no-op at the wasm boundary (verified). The engine only
runs via panproto's **Rust** API (`apply_field_transforms` / `restrict_with_complement`).

So this package **wraps** panproto's Rust crates (as git dependencies, *not* a fork) in a tiny
`wasm-bindgen` crate under [`crate/`](./crate) that exposes the working transform path, compiled to
wasm and vendored here as base64 (`src/wasm/`). When upstream `panproto-wasm` binds this path in a
released `@panproto/core`, delete `crate/` + `src/wasm/` and call `@panproto/core` directly — the
mapping data (Expr ASTs) is unchanged.

The right upstream fix is a `panproto-wasm` export that runs `apply_field_transforms` /
`restrict_with_complement`; file it against `panproto/panproto`.

## Scope

- **Handled here:** scalar field value transforms expressible as an `Expr` (enum knownValues,
  rescaling, reformatting). See the `Panproto.*` expr builders.
- **Not handled here:** array/structural reshaping (join/split, flatten/nest). panproto's
  `apply_field_transforms` binds scalar siblings only; do array + structural shaping in the ECHO
  adapter (TS), before/after this transform. (panproto list transforms are a future enhancement.)

## Rebuilding the vendored wasm

The vendored artifacts (`src/wasm/glue.js`, `src/wasm/glue.d.ts`, `src/wasm/wasm-base64.ts`) are
generated from [`crate/`](./crate). Regenerate when the Rust changes:

```bash
# Prerequisites (one-time):
rustup target add wasm32-unknown-unknown
brew install wasm-pack            # or: cargo install wasm-pack

# From packages/sdk/echo-panproto:
cd crate
wasm-pack build --target web --out-dir ../.wasm-out
cd ..

# Vendor the glue + inline the wasm as base64:
cp .wasm-out/echo_panproto_wasm.js   src/wasm/glue.js
cp .wasm-out/echo_panproto_wasm.d.ts src/wasm/glue.d.ts
{
  printf '//\n// Copyright 2026 DXOS.org\n//\n// GENERATED — base64 of crate wasm-pack output. Rebuild via README. Do not edit.\n//\n\n/* eslint-disable */\nexport const WASM_BASE64 =\n  '\''';
  base64 -i .wasm-out/echo_panproto_wasm_bg.wasm | tr -d '\n';
  printf "'\'';\n";
} > src/wasm/wasm-base64.ts

rm -rf .wasm-out
```

`crate/` pins panproto to a git tag (`v0.56.1`) matching the `@panproto/core` version used elsewhere
in the repo. Bump both together.

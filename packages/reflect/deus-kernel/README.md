# deus-kernel

The DEUS kernel in Rust: a CEK machine that runs Core images, with deep multi-shot effect
handlers, the primitive table and host IO. It is a port of the TypeScript kernel in
[`../deus-lang/src/kernel`](../deus-lang/src/kernel) and must agree with it exactly: running the
seed on the compiler's sources reproduces the seed byte for byte (`tests/seed.rs`), and step
counts match, so `DEUS_MAX_STEPS` stops both kernels at the same step.

```bash
cargo build --release
target/release/deus-kernel compile ../deus-lang/deus --main Cli.main -o out.image
```

- `Text` has JavaScript string semantics (UTF-16 code units), and hash maps iterate in insertion
  order, as a JavaScript `Map` does.
- Host IO goes through the `Host` trait: `SystemHost` for native and WASI, or one an embedder
  supplies.
- `DEUS_SEED`, `DEUS_TRACE`, `DEUS_PROFILE` and `DEUS_MAX_STEPS` work as in the TypeScript CLI.
- `wasm32-wasip1`: `cargo build --release --target wasm32-wasip1`, then
  `node wasi/run.mjs target/wasm32-wasip1/release/deus-kernel.wasm …` (`scripts/wasm-seed.sh`
  checks it reproduces the seed). The 315 KB kernel is the same machine, with IO through WASI.
- An image appended to the executable (`…image, 20-digit byte length, "DEUSIMG1"`) runs instead
  of the seed: `deus build --native` makes standalone executables this way.

Decision record: [D40](../deus-lang/docs/DECISIONS.md).

## Embedding (Cloudflare Workers, browsers)

`cargo build --release --target wasm32-unknown-unknown --lib` builds a 260 KB kernel with no
imports. [`embed/kernel.mjs`](./embed/kernel.mjs) loads it and runs an entry; every operation the
program leaves unhandled (`IO` included) comes back to JS as a request, the machine suspends with
its stack intact, and `resume` continues with the answer, so asynchronous platform calls need no
asyncify. Values cross as JSON, and user types and abilities by IRI: images carry
`(type "hash" "iri")` and `(ability "hash" "iri")` forms. See P7 and D43.

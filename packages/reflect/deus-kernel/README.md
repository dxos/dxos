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
- An image appended to the executable (`…image, u64 length, "DEUSIMG1"`) runs instead of the seed.

Decision record: [D40](../deus-lang/docs/DECISIONS.md).

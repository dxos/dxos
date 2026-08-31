# protobuf.js → buf

Replace protobuf.js (`@dxos/codec-protobuf`, `@dxos/protobuf-compiler`) with buf
(`@bufbuild/protobuf`, `protoc-gen-es`) and delete both packages.

The measured plan, the thread table, and the findings that shaped them live in
[`docs/audits/protobufjs-to-buf.md`](../../../docs/audits/protobufjs-to-buf.md) — that file is the
spec; this one records only what a session needs to pick the work up.

## The direction

**Change the consumers; do not re-home the types.** `codec-protobuf` dies with protobuf.js, so
nothing it exports needs a new address. Each importing package gets its import deleted and its own
code adjusted to buf — buf's `Any`, buf's plain message shapes, or a local structural type where the
symbol was never about protobuf in the first place.

Two corollaries worth stating, because the obvious alternatives were tried and rejected:

- **No new package for the shared vocabulary.** Extracting `Any`/`Codec`/`RequestOptions` into a
  `common/`-level package does reduce the dependent count, but it preserves the protobuf.js-shaped
  API and costs a publish before anything can land (see the packaging trap below).
- **No type that reproduces the compat shape.** Deriving the protobuf.js shape from buf's generated
  types lets call sites stay as they are, which is the opposite of converting them. The shape-compat
  layer is a bridge to remove, not a foundation.

## Where the value is

The teardown is sliced by consumer, not by proto file — see "The teardown, by consumer" in the
audit. Slice A (value codecs) is independent; B (the `Any` envelope) and C (the RPC seam) interlock
because `ServiceBackend.call` is typed on `Any`; D (the generated barrel) is deleted, not migrated.

## Constraints learned the hard way

- **The generator re-establishes the RPC seam.** `file-generator.ts` emits
  `import type { RequestOptions } from '@dxos/codec-protobuf'` into every service stub. Fix the
  generator or the next `prebuild` undoes the sweep.
- **Buf loses proto3 `optional`.** Every singular message field is optional on the buf side where
  protobuf.js declared it required; repeated and map fields go the other way, because buf always
  materialises the empty collection. Converting a consumer therefore means handling absence, and
  `!` is barred.
- **`Buffer` views are load-bearing.** Both codecs return a `bytes` field as a view into the buffer
  they decoded, so the view type tracks the input. Flattening it broke browser auth silently
  (`AuthExtension` verifies a credential against the challenge it sent) and again one level down for
  a payload inside a resolved `Any`, which is how credential signatures travel. Assertions that
  compare through `canonicalStringify` cannot see this — it renders `Buffer` and `Uint8Array`
  identically. Assert the view type explicitly.
- **`vitest` does not typecheck.** Interop tests passed while `moon build` failed on a nominal-type
  mismatch. Run the build, not just the tests.
- **A new package name must be published before the wiring lands.** Private fails
  `check-public-dependencies` the moment a published package imports it; public fails
  `check-packages-published` until someone runs `node scripts/publish-package.mjs <name>` and
  configures npm trusted publishing. This is why the direction avoids new packages entirely.

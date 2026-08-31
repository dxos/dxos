# protobuf.js → buf

Replace protobuf.js (`@dxos/codec-protobuf`, `@dxos/protobuf-compiler`) with buf
(`@bufbuild/protobuf`, `protoc-gen-es`) and delete both packages.

The measured plan, the thread table, and the findings that shaped them live in
[`docs/audits/protobufjs-to-buf.md`](../../../docs/audits/protobufjs-to-buf.md) — that file is the
spec; this one records only what a session needs to pick the work up.

## Where the value is

Every remaining thread is an import sweep. Nothing is gated: `Any` support landed in the
shape-compat layer, and `#8` — the last thread with cross-peer wire risk — merged in #12833.

## The teardown is a type problem, not a runtime one

Migrating call sites does not make `codec-protobuf` deletable. Its remaining consumers mostly import
**types**, and the transport vocabulary among them (`Any`, `Codec`, `EncodingOptions`,
`RequestOptions`, `ServiceBackend`, `ServiceProvider`, `ServiceDescriptorLike`) contains no
protobuf.js at all — `hypercore`, `feed-store`, `messaging`, `blade-runner` and `client-services`
import it and are not protobuf.js consumers, so no migration thread ever removes them.

`@dxos/codec` is that vocabulary, extracted so `codec-protobuf` implements it rather than defines
it. Doing this **before** the remaining sweeps is what makes the teardown a deletion: each thread
landing afterwards imports from the new home, so the dependent list shrinks monotonically instead of
being re-established by every new call site.

It cannot live in `@dxos/protocols`: `hypercore` and `feed-store` are `common/` packages that do not
depend on it, and routing them through `core/` inverts the layering.

## Constraints learned the hard way

- **A new package name must be published before the wiring lands.** Private fails
  `check-public-dependencies` the moment a published package imports it; public fails
  `check-packages-published` until someone runs `node scripts/publish-package.mjs <name>` and
  configures npm trusted publishing. Both checks run in CI. Same trap the `blob` project hit.
- **`Buffer` views are load-bearing.** Both codecs return a `bytes` field as a view into the buffer
  they decoded, so the view type tracks the input. Flattening it broke browser auth silently
  (`AuthExtension` verifies a credential against the challenge it sent) and again one level down for
  a payload inside a resolved `Any`, which is how credential signatures travel. Assertions that
  compare through `canonicalStringify` cannot see this — it renders `Buffer` and `Uint8Array`
  identically. Assert the view type explicitly.
- **`vitest` does not typecheck.** Interop tests passed while `moon build` failed on a nominal-type
  mismatch. Run the build, not just the tests.

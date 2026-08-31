# Tasks — protobuf.js → buf

Slice letters are the audit's ("The teardown, by consumer"); numbers are its thread table.

## Phase: teardown by consumer

- [x] **Slice A — value codecs.** `Codec`/`EncodingOptions` gone from `hypercore`, `feed-store` and
      `client-services`; `createCodecEncoding` takes a structural `ValueCodec<T>` and no longer
      threads protobuf.js encoding options. Packages declaring the dependency: 11 → 8.
- [ ] **Slice B — the `Any` envelope.** `Any`/`WithTypeUrl`/`TaggedType` in `messaging` (4 files),
      `rpc` (3), `blade-runner` (2), `teleport-extension-gossip`. Legacy `{ type_url, value }` →
      buf's `{ $typeName, typeUrl, value }`; `{ '@type': … }` tagging goes with `preserveAny`.
- [ ] **Slice C — the RPC seam.** `RequestOptions`/`ServiceBackend`/`ServiceProvider`/
      `ServiceDescriptorLike` in `rpc/service.ts`, `client-protocol` (2), `protocols/buf/service.ts`.
      **Fix `protobuf-compiler`'s `file-generator.ts` first** or the next prebuild re-adds the
      import. Land with B — `ServiceBackend.call(method, request: Any)` ties them together.
- [ ] **Slice D — the generated barrel.** `protocols/proto/{gen,substitutions,types}.ts` and
      `protobuf-compiler`'s own fixtures. Deleted with the two packages, not migrated.

## Phase: type fixes that are not import swaps

- [ ] `echo-client/automerge/repo-proxy.ts` — `initialValue as Struct` hides an unconstrained
      `create<T>`. Constraining `T` ripples through echo-client's public API, since a TS `interface`
      is not assignable to `Record<string, unknown>`.
- [ ] `client-services/pipeline/codec.ts` — type is buf-agnostic as of slice A; swapping the codec
      instance is the signed feed-block replication path and wants cross-version feed fixtures.

## Phase: remaining sweeps

- [ ] `#5` devtools — 14 files still importing `@dxos/protocols/proto/*`.
- [ ] `#9d` credentials — 94 declarations. Signature stability is proven by
      `credentials/buf-compat.test.ts`; what is left is presence handling at each site, per the buf
      `optional` rule in DESIGN.md.
- [ ] `#2` test/example protos — may become moot: deleting the two packages removes their fixtures.

## Phase: finish

- [ ] Delete `@dxos/codec-protobuf` and `@dxos/protobuf-compiler`; drop `protobufjs` from the
      catalog. Also drop the `codec-protobuf` entries from `composer-app/src/vite/optimize-deps.ts`
      and `app-framework/src/vite-plugin/packages.ts`.
- [ ] Retire the shape-compat layer once its consumers read buf shapes directly. The layer imitates
      protobuf.js quirks, and imitation bugs are silent — both `Buffer`-view defects in #12833 were
      exactly that.

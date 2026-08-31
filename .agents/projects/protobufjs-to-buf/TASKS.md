# Tasks — protobuf.js → buf

Thread numbers are the audit's (`docs/audits/protobufjs-to-buf.md`).

## Phase: teardown prerequisite

- [ ] Publish the `@dxos/codec` name and configure npm trusted publishing
      (`node scripts/publish-package.mjs codec`) — needs npm access; both CI package checks fail
      until it is done, so the extraction cannot land before it.
- [x] `Compat<T>` derives the compat shape from buf's generated types, so the compat-codec call
      sites no longer need the protobuf.js barrel to name a type. `echo-host`'s heads store is the
      worked example.
- [x] Extract the transport vocabulary into `@dxos/codec`; `codec-protobuf` implements it.
      Direct dependents of `codec-protobuf`: 11 → 2.

## Phase: remaining sweeps

- [ ] `#5` devtools — 14 files still importing `@dxos/protocols/proto/*`.
- [ ] `#9d` credentials type sweep — 94 declarations. Signature stability is already proven by
      `credentials/buf-compat.test.ts`; this is imports, not cryptography.
- [ ] Both sweeps are now **presence handling**, not import swaps: `Compat<T>` widens every singular
      message field to optional (buf cannot recover proto3 `optional`), and `!` is barred. Take one
      package per change — `keyring` re-exports `KeyRecord` in its own API, so the widening
      propagates to its consumers.
- [ ] `#9c` tail — `client-services/packlets/pipeline/codec.ts`, held back behind `#9d`.
- [ ] `#2` test/example protos — independent; may become moot, since deleting
      `protobuf-compiler`/`codec-protobuf` removes their own fixtures.

## Phase: teardown

- [ ] Delete `@dxos/codec-protobuf` and `@dxos/protobuf-compiler`; drop `protobufjs` from the
      catalog. Reachable only from those two packages once the sweeps land.
- [ ] Retire the shape-compat layer by changing consumers to accept buf's plain message shapes
      (`WithTypeUrl`, `TaggedType`, `Struct`, `TypedProtoMessage` go with it). The layer exists to
      imitate protobuf.js quirks, and imitation bugs are silent — both `Buffer`-view defects in
      #12833 were exactly that.

## Housekeeping

- [ ] Audit status table still lists `#8` as `todo`; it merged in #12833.

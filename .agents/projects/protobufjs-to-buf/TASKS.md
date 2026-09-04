# Tasks — protobuf.js → buf

Groups are the audit's ("The teardown: one dependency chain"). They are a **chain**, not parallel
slices: the generated bindings import `codec-protobuf` themselves, so nothing downstream can start
until everything upstream is done. Only groups 1 and 2 are independent of each other.

## Done

- [x] Value codecs: `createCodecEncoding` takes a structural `ValueCodec<T>`; `hypercore`,
      `feed-store` and `client-services` off `codec-protobuf`.
- [x] `PeerState` to buf at the gossip producer; `SignalResponse`, `SubscribeToSpacesResponse`,
      `LogEntry`, `QueryLogsRequest` to `bufMessage`; the last top-level enums moved.
- [x] Cross-codec agreement guard (258 messages / 518 cases, field-keyed divergence ledger).
- [x] Drop the dead `codec-protobuf` declaration from `teleport-extension-gossip`. 8 → 7.

## Group 1 — the bindings' consumers (263 files, 31 packages) · CRITICAL PATH

Presence handling, not an import swap: buf loses proto3 `optional`, so each site handles absence and
`!` is barred. Order by namespace — two are ~60% of the surface.

- [ ] `dxos/client/services` — 177 sites (`client-services` holds 79 files).
- [ ] `dxos/halo/credentials` — 172 sites. **9 are credentials core** (`halo/credentials/src/credentials/`),
      fenced by default; the other 163 are reachable without touching it.
- [ ] `dxos/echo/metadata` — 38 sites (`#9c`; codec already buf, the exposed type moves).
- [ ] `dxos/echo/feed` — 36 sites (`#9c`; includes the signed feed-block path, wants cross-version
      feed fixtures).
- [ ] `dxos/halo/invitations` — 26 sites.
- [ ] ~20 remaining namespaces, tail.
- [ ] Retire the shape-compat layer. **This is part of group 1, not a step after it** — the layer
      exists so codecs can swap without call sites changing, so it goes when its last consumer does.

## Group 2 — `codec-protobuf`'s direct consumers (14 files, 6 packages) · parallel to group 1

- [ ] **Fix `protobuf-compiler`'s `file-generator.ts` first** — it emits
      `import type { RequestOptions } from '@dxos/codec-protobuf'` into every service stub, so the
      next `prebuild` undoes any sweep that skips it.
- [ ] The `Any` envelope — `messaging` (4), `rpc` (3), `blade-runner` (2). Legacy
      `{ type_url, value }` → buf's `{ $typeName, typeUrl, value }`; `{ '@type': … }` goes with
      `preserveAny`.
- [ ] The RPC seam — `rpc` (2), `client-protocol` (2). Lands with the envelope, since
      `ServiceBackend.call(method, request: Any)` is typed on it. `RequestOptions` is removed, not
      retyped.
- [ ] `echo-client/repo-proxy.ts` `Struct` — a real type fix. It exists only for
      `initialValue as Struct`; removing the cast means constraining `create<T>`, which ripples
      through echo-client's public API because a TS `interface` has no implicit index signature.

## Group 3 — the bindings · blocked on group 1

- [ ] Delete `protocols/src/proto/` (generated tree, `substitutions.ts`, `types.ts`), the `./proto`,
      `./proto/*` and `./proto/dxos/*.proto` export-map entries, and the `prebuild` task.

## Group 4 — the two packages · blocked on groups 2 and 3

- [ ] Delete `@dxos/codec-protobuf` and `@dxos/protobuf-compiler`. The 8 generated fixtures under
      `protobuf-compiler/test/proto/gen` go with them — which is why `#2` has nothing to migrate.

## Group 5 — protobufjs · blocked on group 4

- [ ] Drop the `protobufjs: ^8.0.0` catalog pin.
- [ ] Clear the two string allowlists no import sweep can see:
      `composer-app/src/vite/optimize-deps.ts` (2 entries) and
      `app-framework/src/vite-plugin/packages.ts`.

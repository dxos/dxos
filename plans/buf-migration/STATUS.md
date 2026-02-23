# Buf Migration — Status, Plan & Principles

> Branch: `cursor/DX-745-buf-rpc-client-1bd0`
> Last updated: 2026-02-23

---

## Overview

Migrating DXOS protocol types from **protobuf.js** (codegen via `@dxos/codec-protobuf`) to **buf** (`@bufbuild/protobuf`). The migration is incremental: buf types are introduced at service boundaries first, then pushed inward to replace protobuf.js code until it can be fully removed.

**The critical invariant**: buf and protobuf.js produce structurally different runtime objects. Every cast between them is a latent runtime bug. The migration is not complete until **all casts are eliminated** by converting the protobuf.js code they bridge into buf.

---

## Current State

### Build Status

| Status | Detail |
|--------|--------|
| **Build** | Passes (`moon run :build`). One pre-existing failure in `feed:build` from main — unrelated to buf migration. |
| **Lint** | Clean after 5 fixes for inline `import()` type annotations. |
| **Tests** | Failures limited to native SQLite module loading (`better-sqlite3`) — infrastructure issue, not buf-related. |

### Branch Statistics

| Metric | Value |
|--------|-------|
| Commits on branch | 57 |
| Files changed | 895 |
| TypeScript source files changed | ~751 |
| Packages touched | ~80 |
| Lines added/removed | +11,908 / −13,466 |

### Packages Most Affected (by file count)

| Package | Files Changed |
|---------|--------------|
| `client-services` | 70 |
| `assistant-toolkit` | 90 (includes main-branch refactoring) |
| `client` | 40 |
| `plugin-assistant` | 39 |
| `shell` | 35 |
| `plugin-inbox` | 26 |
| `credentials` | 22 |
| `echo-db` | 17 |
| `network-manager` | 14 |
| `messaging` | 13 |
| `echo-pipeline` | 13 |
| `protocols` | 11 |

---

## Cast Audit

### Net Cast Changes Introduced by This Branch

| Cast Type | Added | Removed | Net |
|-----------|-------|---------|-----|
| `as never` | 230 | 0 | +230 |
| `as unknown` | 23 | 7 | +16 |
| `as any` | 6 | 27 | **−21** |

### Current Codebase Totals (all packages)

| Cast Type | Count | Files |
|-----------|-------|-------|
| `as never` | 239 | 91 |
| `as unknown` | 57 | — |
| `as any` | 796 | — |

> The `as any` total (796) is the entire codebase, most pre-existing. This migration **reduced** net `as any` by 21.

### Top Files by `as never` Count

| File | Count |
|------|-------|
| `client-services/.../spaces-service.ts` | 22 |
| `client/src/tests/invitations.test.ts` | 12 |
| `messaging/.../websocket-signal-manager.node.test.ts` | 12 |
| `client-services/.../space-invitation-protocol.ts` | 10 |
| `client-services/.../diagnostics.ts` | 9 |
| `tracing/src/trace-sender.ts` | 7 |
| `client-services/.../data-space.ts` | 7 |

### Cast Categories

**`as never` (230 added)** — Proto/buf boundary conversions:
- Passing buf credentials to protobuf.js pipeline writers.
- Converting protobuf.js responses to buf response types.
- Enum value conversions between the two type systems.
- Service method return types crossing the boundary.

**`as unknown` (23 added)** — Type bridging:
- `PublicKey` message → `@dxos/keys` class conversions (5).
- `google.protobuf.Any` assertion field access (8).
- Service interface implementations (2).
- `SpaceProxy` internal method access (4).
- Other structural conversions (4).

**`as any` (6 added, 27 removed)** — Necessary for:
- Effect Schema generic decoding (2).
- Error `.cause` property access (1).
- Effect type variance (2).
- Test fixtures (2).
- Non-standard browser APIs like `performance.memory` (1).

### Why Casts Are Dangerous

**Casts ARE hiding runtime bugs.** Buf and protobuf.js produce structurally different objects at runtime — they are NOT interchangeable:

- **Buf messages** are plain JS objects created via `create()`. Fields use camelCase, enums are numeric literals, `oneOf` fields are discriminated unions, and missing fields are explicit defaults (e.g., `0`, `""`).
- **Protobuf.js messages** are class instances with prototype methods (`.toJSON()`, `.encode()`, `.decode()`). Fields may use different casing, enums may be string-keyed, and missing fields may be `undefined` vs default-valued.

When a buf object is cast `as never` and passed into protobuf.js code (or vice versa), the receiving code may:
1. Call prototype methods that don't exist on a buf plain object → **runtime crash**.
2. Read fields that have different default semantics → **silent data corruption**.
3. Serialize with the wrong codec → **wire-format errors**.
4. Check `instanceof` → **always false for buf objects** → wrong code paths.

**Every cast is a potential runtime bug.** The fix is not to "make casts safer" — it is to **eliminate them by replacing the protobuf.js code on the other side of the boundary with buf code.** Each cast removed is a bug eliminated.

---

## Architecture & Key Decisions

### 1. `@dxos/protocols/buf` Re-export Layer

All buf types are re-exported through `packages/core/protocols/src/buf/index.ts`:

```ts
export * as buf from '@bufbuild/protobuf';
export * as bufWkt from '@bufbuild/protobuf/wkt';
export * as bufCodegen from '@bufbuild/protobuf/codegenv2';
export { create, fromBinary, toBinary, ... } from '@bufbuild/protobuf';
export { EmptySchema, timestampDate, ... } from '@bufbuild/protobuf/wkt';
```

**Principle**: No package except `@dxos/protocols` imports `@bufbuild/*` directly. This gives a single control point for the buf dependency.

- **147** buf import sites across the codebase (`from '@dxos/protocols/buf'`).
- **171** old proto import sites remain (`from '@dxos/protocols'`).

### 2. PublicKey Encoding Helpers

```ts
export const encodePublicKey = (publicKey: PublicKey): KeysPb.PublicKey => { ... };
export const decodePublicKey = (publicKey: KeysPb.PublicKey): PublicKey => { ... };
```

- **196** usages across the codebase.
- Eliminates manual `create(PublicKeySchema, { data: key.asUint8Array() })` patterns.

### 3. Boundary Cast Helpers (Stopgap — To Be Eliminated)

```ts
export const bufToProto = <T>(value: unknown): T => value as T;
export const protoToBuf = <T>(value: unknown): T => value as T;
```

- Only **2** usages currently — most boundaries use raw `as never` instead.
- These helpers make casts greppable but do NOT make them safe. The goal is to eliminate them entirely by converting the protobuf.js code they bridge into.

### 4. Service Interface Migration Pattern

Services define buf-based interfaces alongside protobuf.js ones:

1. New service types are generated by buf from the same `.proto` files.
2. Service implementations accept buf types at the API boundary.
3. Internal plumbing (pipelines, writers) still uses protobuf.js types — casts at the handoff are **active bugs** waiting to manifest.
4. The next migration step is converting pipeline internals to buf, which eliminates the casts and the bugs they mask.

---

## Migration Principles

1. **Every cast is a bug.** Casts between buf and protobuf.js types silence the compiler but do not make the code correct. The goal is **zero boundary casts**, achieved by converting the protobuf.js code on the other side of each cast to buf.
2. **Outside-in migration**: Start at service API boundaries (client ↔ services), then push inward toward pipelines and storage. Each inward step eliminates a layer of casts.
3. **Single import control point**: All buf imports go through `@dxos/protocols/buf`. No direct `@bufbuild/*` imports in consuming packages.
4. **Never add new casts**: When touching code near a cast, convert the surrounding protobuf.js code to buf to remove the cast. Do not introduce new casts.
5. **Incremental and monotonic**: Each commit should reduce the total cast count or hold it constant. The cast count must trend toward zero.
6. **Test across the boundary**: When removing a cast, add or update tests that exercise the data path end-to-end to catch the runtime bugs the cast was masking.

---

## Remaining Work

The driving metric is **cast count → 0**. Each phase eliminates a category of casts by converting the protobuf.js code they bridge into buf.

### Phase 1: Service Boundaries (Done)

- [x] Buf RPC client implementation (`@dxos/rpc`).
- [x] Buf-based ECHO service implementations.
- [x] Client protocol migration (all service interfaces).
- [x] Type propagation across SDK, plugins, apps.
- [x] PublicKey helper adoption.
- [x] Merge with main (3 merges, 19 conflict resolutions).
- **Result**: Service APIs now speak buf. ~230 `as never` casts remain at internal boundaries.

### Phase 2: Pipeline Internals (~50 casts to eliminate)

Convert the protobuf.js pipeline/writer code so it natively accepts buf types.

- [ ] Migrate `echo-pipeline` feed writers and control pipeline to buf types.
- [ ] Migrate `echo-db` internal message handling to buf.
- [ ] Migrate credential processing (`halo/credentials`) fully to buf.
- [ ] Eliminate `as never` casts at pipeline writer boundaries.
- **Target**: Remove casts in `spaces-service.ts` (22), `space-invitation-protocol.ts` (10), `data-space.ts` (7), `identity-manager.ts` (5), and related files.

### Phase 3: Network & Mesh Layer (~30 casts to eliminate)

- [ ] Migrate `network-manager` signaling to buf types.
- [ ] Migrate `messaging` (signal methods) fully to buf.
- [ ] Migrate teleport extensions (replicator, notarization, gossip) to buf.
- **Target**: Remove casts in `websocket-signal-manager.node.test.ts` (12), `trace-sender.ts` (7), and related files.

### Phase 4: Full Protobuf.js Removal

- [ ] Eliminate all remaining `as never` / `as unknown` boundary casts (must be zero).
- [ ] Remove protobuf.js codegen and `@dxos/codec-protobuf` dependency.
- [ ] Remove `from '@dxos/protocols'` re-exports (old proto types).
- [ ] Remove `bufToProto`/`protoToBuf` helpers (no longer needed).
- [ ] Audit and remove dead proto type imports.

---

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| **230 `as never` boundary casts** | **Critical** | Each is a potential runtime bug. Buf and protobuf.js objects are structurally different. Fix: convert protobuf.js code on the other side to buf. |
| **23 `as unknown` casts** | **High** | Type bridging for PublicKey, Any fields, SpaceProxy. Fix: same — migrate consuming code to buf. |
| `as unknown` for `Any` field access | High | 8 sites where `google.protobuf.Any` assertion fields need unsafe access. Fix: use buf's `Any.unpack()` or typed wrappers. |
| `feed:build` failure | Low | Pre-existing from main. New `feed` package has unresolved imports (`@dxos/protocols`, `@dxos/sql-sqlite`). Not related to buf migration. |
| `better-sqlite3` test failures | Low | Native module loading issue. Infrastructure, not migration. |

---

## Reference: Commit History

57 commits organized by phase:

1. **Foundation** — Buf RPC client, ECHO service implementations, `@dxos/protocols/buf` re-exports.
2. **Service Interfaces** — Migrated all client-protocol services (System, Network, Logging, Identity, Devices, Contacts, Invitations, Spaces, Queue, Devtools, Tracing, Edge).
3. **Type Propagation** — Pushed buf types through SDK (`client`, `client-services`, `shell`), plugins (`space`, `thread`, `debug`, `observability`, etc.), and apps (`composer-app`).
4. **Cast Reduction** — Introduced `encodePublicKey`/`decodePublicKey`, removed 87 unnecessary `as never` casts, eliminated `as any` at boundaries.
5. **Merge & Stabilization** — 3 merges from main, resolved 19 conflicts, fixed lint errors.

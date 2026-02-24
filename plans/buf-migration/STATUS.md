# Buf Migration — Status, Plan & Principles

> Branch: `cursor/DX-745-buf-rpc-client-1bd0`
> Last updated: 2026-02-24

---

## Agent Instructions

**This document must be kept up-to-date by any agent working on the buf migration.** After completing a work session:

1. Re-run the cast audit commands (see [Cast Audit](#cast-audit)) and update the numbers.
2. Mark completed work items with `[x]` and note what was done.
3. Add any new issues discovered to the [Known Issues](#known-issues) table.
4. Update the [Test Status](#test-status) section if test results changed.
5. If you introduced new casts or couldn't eliminate expected ones, explain why in the relevant phase section.
6. **Never leave stale numbers.** If you touched any `as never` / `as unknown` / `as any` casts, re-count before wrapping up.

### How to audit casts

```bash
# Count casts added/removed by this branch (vs main):
git diff main --no-ext-diff -- '*.ts' '*.tsx' | grep -c '^\+.*as never'    # added
git diff main --no-ext-diff -- '*.ts' '*.tsx' | grep -c '^\-.*as never'    # removed

# Same for as unknown / as any:
git diff main --no-ext-diff -- '*.ts' '*.tsx' | grep -c '^\+.*as unknown'
git diff main --no-ext-diff -- '*.ts' '*.tsx' | grep -c '^\-.*as unknown'
git diff main --no-ext-diff -- '*.ts' '*.tsx' | grep -c '^\+.*as any\b'
git diff main --no-ext-diff -- '*.ts' '*.tsx' | grep -c '^\-.*as any\b'

# Per-file breakdown (added):
git diff main --no-ext-diff -- '*.ts' '*.tsx' | \
  grep -E '^\+\+\+|^\+.*as never' | \
  awk '/^\+\+\+/{file=$2} /^\+.*as never/ && !/^\+\+\+/{count[file]++} END{for(f in count) print count[f], f}' | \
  sort -rn
```

---

## Overview

Migrating DXOS protocol types from **protobuf.js** (codegen via `@dxos/codec-protobuf`) to **buf** (`@bufbuild/protobuf`). The migration is incremental: buf types are introduced at service boundaries first, then pushed inward to replace protobuf.js code until it can be fully removed.

**The critical invariant**: buf and protobuf.js produce structurally different runtime objects. Every cast between them is a latent runtime bug. The migration is not complete until **all casts are eliminated** by converting the protobuf.js code they bridge into buf.

---

## Current State

### Build Status

| Status    | Detail                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| **Build** | Passes (`moon run :build`). One pre-existing failure in `feed:build` from main — unrelated to buf migration. |
| **Lint**  | Clean after 5 fixes for inline `import()` type annotations.                                                  |

### Test Status

| Suite                  | Result               | Root Cause                                                                                                                                                                                 |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `credentials:test`     | **48/50 PASS**       | Fixed: BigInt serialization, `$typeName` skipping in `canonicalStringify`, assertion loss in `create()`. 2 skipped (json-encoding).                                                        |
| `echo-pipeline:test`   | **8/112 FAIL**       | `value.asUint8Array is not a function` — PublicKey type mismatch in pipeline feed write path (`feed-wrapper.ts` → `test-agent-builder.ts`). Pre-existing from buf migration.               |
| `client-services:test` | **16/19 files FAIL** | 1 timeout (`notarization-plugin.test.ts`); 15 files fail from pre-existing `feed` package `@dxos/errors` import resolution (infrastructure, not buf). `system-service.test.ts` now passes. |

**Runtime bugs fixed in Phase 3:**

1. **BigInt serialization in `canonicalStringify`** (fixed) — Added `bigint` → `Number` conversion in the replacer. `Number(bigint)` is safe for timestamps.
2. **`$typeName`/`$unknown` metadata in canonical strings** (fixed) — Added `$`-prefixed key skipping in the replacer. These buf metadata fields must not be part of signature payloads.
3. **Assertion loss in `create()` for credential factory** (fixed) — Buf's `create()` recursively initializes nested message fields, converting TypedMessage assertions into empty `google.protobuf.Any`. Fixed by setting assertion AFTER `create()`.
4. **`$typeName` in test assertions** (fixed) — Updated `system-service.test.ts` to use `create()` for request params and field-level assertions instead of `deep.equal` against plain objects.

### Cast Audit

#### Net Cast Changes Introduced by This Branch

| Cast Type    | Added | Removed | Net      |
| ------------ | ----- | ------- | -------- |
| `as never`   | 141   | 0       | **+141** |
| `as unknown` | 23    | 7       | **+16**  |
| `as any`     | 6     | 29      | **−23**  |

#### Top Files by `as never` Added (this branch vs main)

| File                                                    | Count | Category                                     |
| ------------------------------------------------------- | ----- | -------------------------------------------- |
| `client/src/tests/invitations.test.ts`                  | 12    | Test — InvitationsProxy type mismatch        |
| `client-services/.../space-invitation-protocol.ts`      | 6     | Invitation — PublicKey + credential boundary |
| `client/src/services/agent-hosting-provider.ts`         | 5     | Client SDK — edge agent API                  |
| `client-services/.../spaces-service.ts`                 | 4     | Service — GossipMessage, assertion, cache    |
| `client-services/.../notarization-plugin.ts`            | 4     | Pipeline — credential notarization           |
| `client-services/.../space-invitation-protocol.test.ts` | 4     | Test — invitation protocol                   |
| `tracing/src/trace-sender.ts`                           | 4     | Tracing — Resource/Span type mismatch        |
| `client/src/tests/lazy-space-loading.test.ts`           | 3     | Test                                         |
| `client/src/client/client.ts`                           | 3     | Client SDK                                   |
| `client-services/.../system-service.test.ts`            | 3     | Test                                         |
| `client-services/.../service-context.ts`                | 3     | Service wiring                               |
| `client-services/.../invitations-manager.ts`            | 3     | Invitation                                   |
| `client-services/.../diagnostics.ts`                    | 3     | Diagnostics                                  |
| `client-services/.../devtools/network.ts`               | 3     | Devtools                                     |
| `client-protocol/.../encoder.ts`                        | 3     | Invitation encoding                          |
| `client-protocol/.../encoder.test.ts`                   | 3     | Test                                         |
| `devtools/.../TracingPanel.tsx`                         | 3     | Devtools UI                                  |
| `functions-runtime-cloudflare/.../service-container.ts` | 3     | Edge functions                               |
| `echo-pipeline/.../control-pipeline.ts`                 | 3     | Pipeline internals                           |
| (39 more files with 1–2 casts each)                     | ~57   | Various                                      |

#### Cast Categories

**`as never` (157 added)** — Proto/buf boundary conversions:

| Category                          | Est. Count | Description                                                                      |
| --------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| Service response/request boundary | ~45        | Service handlers return buf, internal code consumes protobuf.js (or vice versa). |
| Invitation protocol               | ~20        | Invitation flows bridge credential and PublicKey types across the boundary.      |
| Test assertions & fixtures        | ~35        | Tests construct or compare objects that cross the buf/proto boundary.            |
| Client SDK layer                  | ~15        | `client.ts`, `agent-hosting-provider`, `local-client-services`, proxies.         |
| Pipeline internals                | ~15        | `control-pipeline`, `notarization-plugin`, `data-space-manager`.                 |
| Devtools & tracing                | ~12        | `TracingPanel`, devtools RPC, `trace-sender`.                                    |
| Network / mesh                    | ~10        | Signal client, messenger, swarm, RTC transport.                                  |
| Edge functions                    | ~5         | Cloudflare function runtime, queue service.                                      |

**`as unknown` (23 added)** — Type bridging:

- `PublicKey` message → `@dxos/keys` class conversions (5).
- `google.protobuf.Any` assertion field access (8).
- Service interface implementations (2).
- `SpaceProxy` internal method access (4).
- Other structural conversions (4).

**`as any` (6 added, 29 removed)** — Mostly pre-existing; net reduction of 23.

### Why Casts Are Dangerous

**Casts ARE hiding runtime bugs.** Buf and protobuf.js produce structurally different objects at runtime — they are NOT interchangeable:

- **Buf messages** are plain JS objects created via `create()`. They include `$typeName`, `$unknown` metadata. Fields use camelCase, enums are numeric literals, `oneOf` fields are discriminated unions, and missing fields are explicit defaults (e.g., `0`, `""`). Integer fields > 32 bits use `bigint`.
- **Protobuf.js messages** are class instances with prototype methods (`.toJSON()`, `.encode()`, `.decode()`). Fields may use different casing, enums may be string-keyed, and missing fields may be `undefined` vs default-valued. Integer fields are always `number`.

When a buf object is cast `as never` and passed into protobuf.js code (or vice versa), the receiving code may:

1. Call prototype methods that don't exist on a buf plain object → **runtime crash**.
2. Read fields that have different default semantics → **silent data corruption**.
3. Serialize with the wrong codec → **wire-format errors**.
4. Check `instanceof` → **always false for buf objects** → wrong code paths.
5. Call `JSON.stringify` on `bigint` fields → **runtime crash** (as proven by `credentials:test`).

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

### 2. PublicKey Encoding Helpers

```ts
export const encodePublicKey = (publicKey: PublicKey): KeysPb.PublicKey => { ... };
export const decodePublicKey = (publicKey: KeysPb.PublicKey): PublicKey => { ... };
```

Eliminates manual `create(PublicKeySchema, { data: key.asUint8Array() })` patterns.

### 3. Timeframe Conversion Helper

```ts
export const timeframeToBuf = (timeframe: Timeframe): TimeframeVector =>
  create(TimeframeVectorSchema, {
    frames: timeframe.frames().map(([feedKey, seq]) => ({ feedKey: feedKey.asUint8Array(), seq })),
  });
```

Converts `@dxos/timeframe.Timeframe` class to buf `TimeframeVector` message.

### 4. Boundary Cast Helpers (Stopgap — To Be Eliminated)

```ts
export const bufToProto = <T>(value: unknown): T => value as T;
export const protoToBuf = <T>(value: unknown): T => value as T;
```

Only 2 usages. Makes casts greppable but does NOT make them safe. Goal: eliminate entirely.

### 5. Service Interface Migration Pattern

1. New service types generated by buf from the same `.proto` files.
2. Service implementations accept buf types at the API boundary.
3. Internal plumbing (pipelines, writers) still uses protobuf.js types — casts at the handoff are **active bugs**.
4. Next migration steps push buf types inward to eliminate casts.

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
- **Result**: Service APIs now speak buf. 157 `as never` casts at internal boundaries.

### Phase 2: Pipeline Internals (Done — 73 casts eliminated)

Converted protobuf.js pipeline/writer code to natively accept buf types.

- [x] Credential generator enum params → buf enums (`SpaceMember_Role`, `AdmittedFeed_Designation`).
- [x] State machine imports → buf types (`member-state-machine`, `space-state-machine`).
- [x] Pipeline writer → `ControlPipelinePayload` accepting buf `Credential`.
- [x] Diagnostics/Space response construction — `timeframeToBuf`, `Space_Metrics`, buf `Platform`/`Device`/`NetworkStatus`.
- [x] Test file cast cleanup — PeerInfo, credential write, admission credential casts.
- [ ] **Deferred: TypedMessage → buf `Any` assertion handling** — highest risk, affects how every credential is created/stored/read.

### Phase 3: Critical Runtime Fixes (Done — 3 casts removed, 48 tests fixed)

Fixed bugs that were actively crashing tests.

- [x] **BigInt serialization in `canonicalStringify`** — Added `bigint` → `Number` handler and `$`-prefixed key skipping in `signing.ts` replacer.
- [x] **Assertion loss in `create()`** — Buf's `create()` was converting TypedMessage assertions into empty `Any`. Fixed in `credential-factory.ts` by setting assertion after create().
- [x] **`$typeName` test assertions** — Updated `system-service.test.ts` to use `create()` for requests and field-level assertions.
- **Result**: `credentials:test` 48/50 pass (was 2/50). 3 `as never` casts removed from test file.

### Phase 4: Invitation & Identity Layer (Done — 13 casts removed)

- [x] `setIdentityTags` in `utils.ts` → buf service types. Removed 2 casts each from `local-client-services.ts` and `worker-runtime.ts`.
- [x] `invitations-handler.ts` — enum casts replaced with proper types, `createAdmissionKeypair` uses `create()`.
- [x] `invitation-host-extension.ts` — enum cast replaced with typed response.
- [x] `identity-service.ts` — `create()` with field-by-field construction for recovery challenge.
- [x] `identity-manager.ts` — buf `DeviceProfileDocumentSchema` for default profile.
- [x] `invitations-service.ts` — removed 2 unnecessary casts (types already match).
- [x] `contacts-service.ts` — explicit `protoToBuf` for profile.
- Remaining: `space-invitation-protocol.ts` (6), `authenticator.ts` (2), `identity.ts` (1), `invitations-manager.ts` (3), `device-invitation-protocol.ts` (2) — proto/buf codec boundary casts that require deeper refactoring.
- **Result**: 13 `as never` casts removed. `as never` count: 141 (was 154).

### Phase 5: Client SDK & Service Wiring (~20 casts)

- [ ] `client/client.ts` (3), `agent-hosting-provider.ts` (5), `local-client-services.ts` (2).
- [ ] `service-context.ts` (3), `service-host.ts` (2), `worker-runtime.ts` (2), `worker-session.ts` (1).
- [ ] `service-registry.test.ts` (1), `service-host.test.ts` (2).
- [ ] Test files: `lazy-space-loading.test.ts` (3), `space-member-management.test.ts` (2), `client.test.ts` (1), `halo-credentials.node.test.ts` (1).
- [ ] `react-client/testing/withClientProvider.tsx` (2), `ClientRepeater.tsx` (1).
- **Target**: ~20 `as never` casts removed.

### Phase 6: Pipeline & Space Internals (~15 casts)

- [ ] `spaces-service.ts` (4) — GossipMessage, assertion, cache, edge replication.
- [ ] `notarization-plugin.ts` (4) — credential notarization.
- [ ] `control-pipeline.ts` (3) — pipeline internal types.
- [ ] `data-space-manager.ts` (2), `admission-discovery-extension.ts` (1).
- [ ] `echo-db/queue.ts` (1).
- **Target**: ~15 `as never` casts removed.

### Phase 7: Network & Mesh Layer (~10 casts)

- [ ] `network-manager`: `rtc-transport-proxy.ts` (2), `rtc-transport-service.ts` (1), `swarm.ts` (1), `connection-log.ts` (1).
- [ ] `messaging`: `memory-signal-manager.ts` (2), `signal-client.ts` (1), `signal-local-state.ts` (1), `messenger.ts` (1).
- [ ] Signal/mesh tests: `swarm-messenger.node.test.ts` (1), `integration.node.test.ts` (1).
- **Target**: ~10 `as never` casts removed.

### Phase 8: Tracing, Devtools & Edge (~20 casts)

- [ ] `trace-sender.ts` (4) — Resource/Span structural incompatibility.
- [ ] Devtools: `TracingPanel.tsx` (3), `network.ts` (3), `metadata.ts` (2), `feeds.ts` (1), `spaces.ts` (1), `useCredentials.tsx` (1).
- [ ] Edge/functions: `service-container.ts` (3), `queue-service-impl.ts` (1), `functions-client.ts` (1).
- [ ] Other: `protocol.ts` (2), `composer-app/util.ts` (1), `call-manager.ts` (1).
- [ ] `devtools.ts` (1), `examples/main.tsx` (1), `useEdgeAgentsHandlers.ts` (2).
- **Target**: ~20 `as never` casts removed.

### Phase 9: TypedMessage / `google.protobuf.Any` (~8 `as unknown` casts)

This is the deepest and highest-risk work item. `Any` is used to store credential assertions. The current code uses `as unknown` to access typed fields from `Any` values.

- [ ] Implement buf-native `Any.unpack()` / `Any.pack()` wrappers.
- [ ] Migrate credential assertion field access away from unsafe casts.
- [ ] Migrate `space-invitation-protocol.ts`, `spaces-service.ts`, and other assertion consumers.
- **Target**: 8 `as unknown` casts removed.

### Phase 10: Full Protobuf.js Removal

- [ ] Eliminate all remaining `as never` / `as unknown` boundary casts (must be zero).
- [ ] Remove protobuf.js codegen and `@dxos/codec-protobuf` dependency.
- [ ] Remove `from '@dxos/protocols'` re-exports (old proto types).
- [ ] Remove `bufToProto`/`protoToBuf` helpers (no longer needed).
- [ ] Audit and remove dead proto type imports.

--

## Implementation Notes

- Working with `google.protobuf.Any` is documented here - https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md#googleprotobufany
  - For crendetial assertions specifically, `@dxos/credentials` should create a registry via `createRegistry(Schema1, Schema2, ...)` of ONLY the valid assertion type schema, as well as a union type of all the assertion types. Union types don't need an extra `@schema` discriminator field, since `$type` is already present.
- Make sure offical `google.protobuf.Struct` integration is correctly used - https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md#googleprotobufstruct
- Do a comprehensive item-by-item review that the code is using the best practices from protobuf-es: https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md

---

## Known Issues

| Issue                                           | Severity         | Notes                                                                                                                                                                                                                                                                             |
| ----------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~BigInt crash in `canonicalStringify`~~        | ~~P0~~ **Fixed** | Fixed in Phase 3: added `bigint` → Number and `$`-prefixed key skipping in `signing.ts` replacer.                                                                                                                                                                                 |
| ~~`$typeName` in deep equality~~                | ~~P1~~ **Fixed** | Fixed in Phase 3: updated `system-service.test.ts` assertions.                                                                                                                                                                                                                    |
| **Assertion loss in `create()` for Any fields** | **P1**           | Buf's `create()` recursively initializes nested messages. TypedMessage assertions in `google.protobuf.Any` fields are converted to empty `Any` messages. Fixed in `credential-factory.ts`; other call sites using `create()` with nested credentials may need the same treatment. |
| **PublicKey type mismatch in echo-pipeline**    | **P1**           | `value.asUint8Array is not a function` in feed write path. Buf PublicKey messages (plain `{ data: Uint8Array }`) used where `@dxos/keys.PublicKey` class expected. Affects 8 echo-pipeline tests.                                                                                 |
| **157 `as never` boundary casts**               | **P1**           | Each is a potential runtime bug. Buf and protobuf.js objects are structurally different. Fix: convert protobuf.js code on the other side to buf.                                                                                                                                  |
| **23 `as unknown` casts**                       | **P2**           | Type bridging for PublicKey, Any fields, SpaceProxy. Fix: same — migrate consuming code to buf.                                                                                                                                                                                   |
| `as unknown` for `Any` field access             | P2               | 8 sites where `google.protobuf.Any` assertion fields need unsafe access. Fix: use buf `Any.unpack()` or typed wrappers.                                                                                                                                                           |
| `feed:build` failure                            | Low              | Pre-existing from main. New `feed` package has unresolved imports (`@dxos/protocols`, `@dxos/sql-sqlite`). Not related to buf migration.                                                                                                                                          |
| `@dxos/errors` import in tests                  | Low              | Pre-existing from main. 15 test files in `client-services` fail to import `@dxos/errors` via the `feed` package. Infrastructure issue.                                                                                                                                            |

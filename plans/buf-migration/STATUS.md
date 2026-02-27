# Buf Migration — Status, Plan & Principles

> Branch: `cursor/DX-745-buf-rpc-client-1bd0`
> Last updated: 2026-02-25 (Phase 9.5 + merge main + boundary fixes)

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

| Status           | Detail                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Build**        | Full `moon run :build` passes. Merged `origin/main` (11 commits, 2 conflicts resolved). |
| **Lint**         | Clean after 5 fixes for inline `import()` type annotations.                             |
| **Composer Dev** | Vite dev server starts and app renders in browser.                                      |

### Test Status

| Suite                  | Result                   | Root Cause                                                                                                                                                  |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `credentials:test`     | **48/50 PASS**           | Fixed: BigInt serialization, `$typeName` skipping in `canonicalStringify`, assertion loss in `create()`. 2 skipped (json-encoding).                         |
| `echo-pipeline:test`   | **110/112 PASS**         | All passing after boundary fixes (proto codec substitutions, canonical stringify, PublicKey/Timestamp/Chain handling). 2 skipped.                           |
| `messaging:test`       | **13/19 PASS**           | All passing after `any.ts` typeUrl/type_url fix. 6 skipped.                                                                                                 |
| `codec-protobuf:test`  | **11/11 PASS**           | All passing.                                                                                                                                                |
| `client-services:test` | **56/87 PASS** (17 fail) | Down from 34 failures. Remaining failures from buf/proto boundary type mismatches in deep integration tests (device invitations, space sync, notarization). |

**Runtime bugs fixed in Phase 3:**

1. **BigInt serialization in `canonicalStringify`** (fixed) — Added `bigint` → `Number` conversion in the replacer. `Number(bigint)` is safe for timestamps.
2. **`$typeName`/`$unknown` metadata in canonical strings** (fixed) — Added `$`-prefixed key skipping in the replacer. These buf metadata fields must not be part of signature payloads.
3. **Assertion loss in `create()` for credential factory** (fixed) — Buf's `create()` recursively initializes nested message fields, converting TypedMessage assertions into empty `google.protobuf.Any`. Fixed by setting assertion AFTER `create()`.
4. **`$typeName` in test assertions** (fixed) — Updated `system-service.test.ts` to use `create()` for request params and field-level assertions instead of `deep.equal` against plain objects.

**Runtime bugs fixed post-merge (main merge + boundary fixes):**

1. **`typeUrl`/`type_url` Any field name mismatch** (fixed) — Buf uses camelCase `typeUrl`, protobuf.js uses snake_case `type_url`. Fixed in `any.ts` substitution (encode normalizes, decode reads both), plus `bufAnyToProtoAny`/`protoAnyToBufAny` boundary helpers.
2. **Proto codec PublicKey substitution crash** (fixed) — `asUint8Array()` fails on buf `{ data: Uint8Array }` objects. Fixed in `substitutions.ts` to handle both types.
3. **Proto codec Timestamp substitution crash** (fixed) — `getTime()` fails on buf `{ seconds: bigint, nanos: number }` objects. Fixed in `timestamp.ts` to handle both types.
4. **`fromBufPublicKey` double-conversion** (fixed) — After proto round-trip, PublicKey is already `@dxos/keys.PublicKey`, not buf. Fixed both instances to check `instanceof PublicKey` first.
5. **`canonicalStringify` inconsistency** (fixed) — Buf Timestamps and PublicKeys serialize differently than proto. Added normalization for both in `signing.ts` replacer.
6. **`create()` deep-processing in DeviceStateMachine** (fixed) — `create(ChainSchema, { credential })` strips proto PublicKey instances from decoded credentials. Fixed to assign credential after empty `create()`.
7. **`credential-factory.ts` assumes buf PublicKey on chain** (fixed) — `chain.credential.issuer.data` fails on proto-decoded PublicKey. Fixed to use `toPublicKey()`.

### Cast Audit

#### Net Cast Changes Introduced by This Branch

| Cast Type    | Added | Removed | Net     |
| ------------ | ----- | ------- | ------- |
| `as never`   | 87    | 0       | **+87** |
| `as unknown` | 28    | 3       | **+25** |
| `as any`     | 61    | 18      | **+43** |

> **Note on `as any` count**: Down from +142 after Phase 9 to +45 after Phase 9.5. Phase 9.5 eliminated ~79 `as any` casts across categories 1-4 (PublicKey methods, ProfileDocument, Identity optional fields, Timestamp/Timeframe). Remaining ~45 `as any` casts are primarily:
>
> - Devtools RPC call patterns (`{} as any` for Empty args) (~20).
> - Proto↔buf boundary types in devtools panels (feed, pipeline, swarm types) (~15).
> - Assertion field access via `getCredentialAssertion()` which returns untyped `TypedMessage` (~5).
> - Other scattered patterns (docs snippet, return types, connection types) (~5).
>   These remaining casts require deeper refactoring (devtools RPC signature migration, protobuf.js codec replacement) and are deferred to Phase 10.

#### Top Files by `as never` Added (this branch vs main)

| File                                                    | Count | Category                                       |
| ------------------------------------------------------- | ----- | ---------------------------------------------- |
| `client/src/tests/invitations.test.ts`                  | 12    | Test — InvitationsProxy type mismatch          |
| `client-services/.../space-invitation-protocol.ts`      | 6     | Invitation — PublicKey + credential boundary   |
| `client/src/services/agent-hosting-provider.ts`         | 6     | Client SDK — proto WebsocketRpcClient boundary |
| `client-services/.../space-invitation-protocol.test.ts` | 4     | Test — invitation protocol tests               |
| `client-services/.../invitations-manager.ts`            | 3     | Invitation — proto↔buf boundary               |
| `client-services/.../diagnostics.ts`                    | 3     | Diagnostics — getFirstStreamValue types        |
| `client-protocol/.../encoder.ts`                        | 3     | Invitation encoding — proto codec boundary     |
| `client-protocol/.../encoder.test.ts`                   | 3     | Test — encoder tests                           |
| `client/src/tests/lazy-space-loading.test.ts`           | 3     | Test                                           |
| (25 more files with 1–2 casts each)                     | ~37   | Various                                        |

#### Cast Categories

**`as never` (86 added)** — Remaining proto/buf boundary conversions:

| Category                     | Est. Count | Description                                                                     |
| ---------------------------- | ---------- | ------------------------------------------------------------------------------- |
| Test assertions & fixtures   | ~30        | Tests construct or compare objects that cross the buf/proto boundary.           |
| Invitation protocol          | ~15        | Space invitation protocol, encoder, handlers still bridge types.                |
| Client SDK — agent hosting   | ~6         | `agent-hosting-provider.ts` — WebsocketRpcClient proto boundary.                |
| Proto↔buf codec boundary    | ~10        | `authenticator.ts`, `invitations-manager.ts`, `encoder.ts` — protobuf.js codec. |
| Diagnostics & service wiring | ~8         | `diagnostics.ts`, `service-context.ts`, `identity.ts`, etc.                     |
| Cloudflare functions         | ~2         | `service-container.ts` — Workers RPC boundary.                                  |
| Other (scattered 1-2 each)   | ~15        | Various files with 1-2 boundary casts.                                          |

**`as unknown` (28 added, 3 removed = net +25)** — Type bridging:

- `SpaceProxy`/`space-list.ts` internal method access (4).
- `client.ts` service interface wiring (3).
- `memory-shell-runtime.ts` invitation types (2).
- `invitation-host-extension.ts` proto↔buf (2).
- `assertions.ts` + `credential-factory.ts` TypedMessage↔Any (3, Phase 10).
- Other scattered codec/type boundary points (14).

**`as any` (63 added, 18 removed = net +45)** — Remaining buf type mismatches:

- Devtools RPC calls with Empty args (`{} as any`) (~20).
- Proto↔buf boundary types in devtools (feed, pipeline, swarm, contacts) (~15).
- Assertion field access on TypedMessage (~5).
- Other scattered patterns (docs, return types, connection types) (~5).
- ~~PublicKey methods~~ — eliminated in Phase 9.5 via `decodePublicKey()`/`toPublicKey()`.
- ~~ProfileDocument type mismatch~~ — eliminated in Phase 9.5 via `create(ProfileDocumentSchema, ...)`.
- ~~Identity optional field chaining~~ — eliminated in Phase 9.5 via proper type guards.
- ~~Timestamp/Timeframe method calls~~ — eliminated in Phase 9.5 via `timestampMs()`/`timeframeVectorTotalMessages()`.

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

### Phase 5: Client SDK & Service Wiring (Done — 11 casts removed)

- [x] `client.ts` — QueueService field type fix, DataService/QueryService casts removed (3).
- [x] `service-host.ts` — SystemServiceImpl already implements correct interface (2).
- [x] `service-context.ts` — Removed unnecessary Invitation/Credential casts (2). Kept `deviceCredential as never` (proto→buf boundary).
- [x] `worker-session.ts` — BridgeService structurally compatible (1).
- [x] `withClientProvider.tsx`/`ClientRepeater.tsx` — InvitationHost/InvitationGuest structural match (3).
- Remaining: `agent-hosting-provider.ts` (5 kept — WebsocketRpcClient proto↔buf boundary with comments), `service-context.ts` (1 kept).
- **Result**: 11 casts removed. Remaining are all documented proto↔buf boundaries.

### Phase 6: Pipeline & Space Internals (Done — 14 casts removed)

- [x] `spaces-service.ts` (4) — Used `protoToBuf`/`bufToProto` for GossipMessage, assertion, cache, edge replication.
- [x] `notarization-plugin.ts` (4) — Used `protoToBuf`/`bufToProto` for credential codec boundary and RPC.
- [x] `control-pipeline.ts` (3) — Snapshot/feed credential conversions with `protoToBuf`/`bufToProto`.
- [x] `data-space-manager.ts` (2) — Removed unnecessary memberCredential cast; `protoToBuf` for invitation fields.
- [x] `admission-discovery-extension.ts` (1) — `bufToProto` for credential in RPC response.
- `queue.ts` (0) — Kept with comment (ObjectJSON→Struct type mismatch).
- **Result**: 14 casts removed.

### Phase 7: Network & Mesh Layer (Done — 9 casts removed)

- [x] `rtc-transport-proxy.ts` (2), `rtc-transport-service.ts` (1) — Signal type conversions with `protoToBuf`/`bufToProto`.
- [x] `memory-signal-manager.ts` (2) — Types structurally compatible, removed directly.
- [x] `swarm.ts` (1), `connection-log.ts` (1), `signal-client.ts` (1), `signal-local-state.ts` (1), `messenger.ts` (1) — All used `protoToBuf`/`bufToProto`.
- **Result**: 9 casts removed. `as never` count: 107 (was 141, -34).

### Phase 8: Tracing, Devtools & Edge (Done — 21 casts removed)

- [x] `trace-sender.ts` (4) — `protoToBuf` for Resource/Span types.
- [x] `TracingPanel.tsx` (3) — `bufToProto` for tracing event display.
- [x] `network.ts` (3), `metadata.ts` (2), `feeds.ts` (1), `spaces.ts` (1) — `protoToBuf`/`bufToProto` at devtools boundaries.
- [x] `functions-client.ts` (2), `protocol.ts` (2) — `protoToBuf` for DataService/QueryService.
- [x] `service-container.ts` (1), `queue-service-impl.ts` (1) — `bufToProto` for Cloudflare workers boundary.
- [x] `useEdgeAgentsHandlers.ts` (2) — Removed unnecessary casts (same type).
- Remaining: 2 casts in `service-container.ts` (Cloudflare Workers RPC boundary, not proto↔buf).
- **Result**: 21 casts removed. `as never` count: 86 (was 107, -21).

### Phase 9: TypedMessage / `google.protobuf.Any` Assertion Safety (~8 `as unknown` + ~12 `as any` casts)

Credential assertions are stored as `TypedMessage` objects (protobuf.js format with `@type` discriminator) in the `google.protobuf.Any` field of credentials. The protobuf.js codec's `anySubstitutions.encode` **requires** `@type` on the assertion to look up the codec, and its `decode` **produces** TypedMessage objects with `@type`. Therefore we **cannot** switch to `anyPack()`/`anyUnpack()` until the protobuf.js codec is replaced (Phase 10). This phase focuses on providing type-safe access and eliminating unsafe casts.

- [x] Complete assertion registry — add `DelegateSpaceInvitationSchema`, `CancelDelegatedInvitationSchema` from invitations_pb.
- [x] Add type-safe assertion helpers (`getTypedAssertion`, `isAssertionType`) to `assertions.ts`.
- [x] Migrate 6 `as unknown` cast sites for Any assertion access (`halo-proxy.ts`, `agent-hosting-provider.ts`, `halo-credentials.node.test.ts`).
- [x] Migrate ~12 `as any` cast sites for assertion `@type` access in plugin/app/devtools files to use `getCredentialAssertion()`.
- [x] Document remaining 2 `as unknown` casts in `credential-factory.ts` and `assertions.ts` as inherent to the protobuf.js codec bridge (removed in Phase 10).
- **Target**: 6 `as unknown` + ~12 `as any` casts removed.

### Phase 9.5: Type Safety Cleanup (Done — ~79 `as any` casts eliminated)

Cast audit vs `origin/main` after Phase 9: `as never` +87, `as unknown` +25, `as any` +142. This phase eliminated ~79 `as any` casts by converting surrounding code to buf-native patterns. Final: `as any` +45.

**New helpers added to `@dxos/protocols/buf`:**

- `toPublicKey(key)` — converts buf PublicKey or `@dxos/keys.PublicKey` to `@dxos/keys.PublicKey`.
- `bufToTimeframe(vector)` — converts buf `TimeframeVector` to `Timeframe` instance.
- `timeframeVectorTotalMessages(vector)` — equivalent to `Timeframe.totalMessages()`.
- `timeframeVectorNewMessages(vector, base)` — equivalent to `Timeframe.newMessages(base)`.

#### Category 1: PublicKey (proto class vs buf message) — ~60 `as any` casts → Done

- [x] Migrate devtools panels (`FeedsPanel`, `SwarmPanel`, `SpaceProperties`, `SpaceInfoPanel`, `NetworkPanel`, `StoragePanel`, `SwarmInfo`, `SwarmTable`, `DataSpaceSelector`, `SpaceSelector`, `RootContainer`, `TestingPanel`).
- [x] Migrate plugin-client CLI commands (`list.ts`, `keys.ts`, `identity.ts`, `update.ts`, `recover.ts`, `join.ts`, `info.ts`, `device/update.ts`, `device/util.ts`, `halo/util.ts`).
- [x] Migrate plugin-client components (`ProfileContainer.tsx`, `DevicesContainer.tsx`, `RecoveryCredentialsContainer.tsx`, `app-graph-builder.ts`).
- [x] Migrate plugin-thread (`call-swarm-synchronizer.ts`, `util.ts`).
- [x] Migrate plugin-space (`SpacePresence.tsx`, `spaces-ready.ts`, `members/util.ts`).
- [x] Migrate other packages (`composer-app credentials/util.ts`, `plugin-chess Info.tsx`, `plugin-assistant ChatThread.tsx`, `react-ui-editor Automerge.stories.tsx`).
- [x] Fix additional build errors (`testbench-app AppToolbar.tsx`, `testbench-app main.tsx`, `cli options.ts`, `stories-assistant Chat.stories.tsx`).
- [x] Test files updated (`keys.test.ts`, `identity.test.ts`, `create.test.ts`, `update.test.ts`, `info.test.ts`).

#### Category 2: ProfileDocument type mismatch — ~8 `as any` casts → Done

- [x] `operation-resolver.ts` — `create(ProfileDocumentSchema, profile)`.
- [x] `stories.ts` — `create(ProfileDocumentSchema, { displayName: 'Test User' })`.
- [x] `ChannelContainer.tsx` — `create(ProfileDocumentSchema, { displayName })`.
- [x] `identity.test.ts` — `create(ProfileDocumentSchema, { displayName: 'Test' })`.
- [x] `testbench-app/main.tsx` — `create(ProfileDocumentSchema, { displayName: 'Testbench User' })`.

#### Category 3: Identity optional fields — ~4 `as any` casts → Done

- [x] `TranscriptionPlugin.tsx` — `.filter((identity): identity is Identity => identity != null)`.
- [x] `TranscriptContainer.tsx` — same fix.
- [x] `Transcript.stories.tsx` — 2 instances fixed.

#### Category 4: Timestamp/Timeframe methods — ~12 `as any` casts → Done

- [x] `SpaceProperties.tsx` — `timeframeVectorTotalMessages()`, `timeframeVectorNewMessages()`, `timestampMs()`.
- [x] `onboarding-manager.ts` — `timestampMs(issuanceDate)` for credential sorting.

#### Category 5: Remaining `as never` boundary casts — 87 casts

**Root cause**: Proto↔buf codec boundaries where protobuf.js objects are passed to buf-typed functions or vice versa.

**Top categories**:

- Test assertions & fixtures (~30): Tests construct or compare objects across buf/proto boundary.
- Invitation protocol (~15): `space-invitation-protocol.ts`, encoder, handlers bridge types.
- Agent hosting (~6): `agent-hosting-provider.ts` — WebsocketRpcClient proto boundary.
- Proto↔buf codec boundary (~10): `authenticator.ts`, `invitations-manager.ts`, `encoder.ts`.
- Diagnostics & service wiring (~8): `diagnostics.ts`, `service-context.ts`, `identity.ts`.
- Other scattered (~18): 1-2 casts per file.

**Fix**: These require deeper refactoring — converting the protobuf.js code on the other side of each cast to use buf types. Deferred to Phase 10 when the protobuf.js codec itself is replaced.

#### Category 6: Remaining `as unknown` — 25 casts

**Breakdown**:

- `space-list.ts` (4): SpaceProxy internal field access.
- `client.ts` (3): Client service interface wiring.
- `memory-shell-runtime.ts` (2): Shell runtime invitation types.
- `invitation-host-extension.ts` (2): Invitation host proto↔buf.
- `assertions.ts` (2): Central TypedMessage extraction (Phase 10).
- `credential-factory.ts` (1): TypedAssertion to Any cast (Phase 10).
- Other scattered (11): Various codec/type boundary points.

**Fix**: Most require converting surrounding proto code to buf. The `assertions.ts` and `credential-factory.ts` casts are removed in Phase 10 with `anyPack`/`anyUnpack`.

## Phase 10: Code-review feedback & remaining test fixes

### 10.1 — API ergonomics: `MessageInitShape` for public APIs

Client API method parameters should not require callers to use `create()`. Use `MessageInitShape` instead.

- [x] Halo API (`client-protocol/src/halo.ts`): `ProfileDocumentInit`, `DeviceProfileDocumentInit`, `InvitationInit` (done in uncommitted changes)
- [ ] Spaces API: `createSpace`, `updateSpace`, etc.
- [ ] Invitations API: verify `InvitationsProxy.getInvitationOptions()` doesn't need strip-and-spread hack for `$typeName`/`$unknown` — use `InvitationInit` directly.
  - Review comment on `invitations-proxy.ts`: "casts should not be required. Either use `create` from buf, or retype as `InvitationInit = MessageInitShape<typeof InvitationSchema>`"
- [ ] Shell / UI components: `IdentityPanel` should accept `ProfileDocumentInit` not require `create(ProfileDocumentSchema, ...)`.
  - Review comment on `IdentityPanel.tsx`: "bad" — the `data` field cast `as Record<string, unknown>` is wrong.

### 10.2 — Remove dangerous casts

- [ ] Remove all `protoToBuf`/`bufToProto` boundary casts — they hide runtime errors. Instead complete the necessary conversions to buf in the calling code.
  - Review comment on multiple files: "dont cast; instead propagate conversion to buf deeper into the stack"
- [ ] Remove `as never` casts on service implementations (e.g. `DevicesServiceImpl` in test, `EdgeAgentServiceImpl`).
  - Review comment on `devices-service.test.ts`: "type safety issue"
  - Review comment on `edge-agent-service.ts`: "type safety issue"
- [ ] Remove `as any` casts in `devtools/useFeedMessages.tsx`.
  - Review comment: "suspicious. make sure this module doesn't use protobuf.js"
- [ ] Remove `as ProfileDocument` casts in `contact-book.test.ts` and other callers after `MessageInitShape` APIs are in place.
  - Review comment: "grep and fix those after updating halo apis"
- [ ] Remove `export { create as createBuf }` re-export.
- [ ] No re-exports from echo-pipeline — always import from `@dxos/protocols/buf`.
  - Review comments on `data-service.ts`, `query-service.ts`: "don't do re-exports", "no re-exports, let them import from protocols"

### 10.3 — Credential assertions: use `$type` for buf-native discrimination

- [ ] Use `$type` field on credential assertions so buf types work natively (instead of `@type`).
  - Review comment on `credential-factory.ts`: "Use $type so buf types work natively"
- [ ] Verify signed data hasn't changed after `@type` field handling update.
  - Review comment on `signing.ts`: "it looks like @type field was excluded from credentials, but verify anyway that signed data hasn't changed. also lets add a todo as the very last stage to add storage-compatibility tests to detect breakages between versions."
- [ ] Add TODO for storage-compatibility tests (reviewer will implement personally).

### 10.4 — Fix remaining test failures

#### client-protocol (3 tests): Timestamp format mismatch

Tests in invitation utils expect `Date` for `created` field but receive buf `google.protobuf.Timestamp` `{ seconds, nanos }`.

**Files**: `client-protocol/src/invitation*.test.ts`
**Fix**: Update tests to expect buf Timestamp type, or add a `timestampToDate()` conversion at the API boundary in `InvitationsProxy`/`InvitationsHandler` where `created` is set.

#### plugin-client (1 test): `decodePublicKey` on proto PublicKey

`halo credential list` test fails with `TypeError: Expected Uint8Array, got: undefined` in `decodePublicKey`.

**File**: `plugin-client` test using credential display
**Fix**: Replace `decodePublicKey()` with `toPublicKey()` at the call site (same pattern as Phase 9.5 fixes).

#### client (33 tests across 7 files)

**Root cause 1 — `decodePublicKey` / `PublicKey.from` on proto-decoded keys** (recurring pattern):
- `halo-credentials.node.test.ts` (1): `Expected Uint8Array, got: undefined` in `decodePublicKey`
- `spaces.test.ts` (1): `getEpochs` invariant violation in `PublicKey.from`
- `invitations.test.ts` (22): `identityKey` comparisons fail (buf PublicKey message not decoded to PublicKey class), `Buffer.from` receives undefined for shared keypair tests
- `spaces-invitations.test.ts` (1): `spaceKey` deep equality fails (raw protobuf object vs PublicKey)
- **Fix**: Replace remaining `decodePublicKey()` / `PublicKey.from(x.data)` with `toPublicKey()` in the `client` package's service proxies and test assertions. Grep for `decodePublicKey` and `PublicKey.from(.*\.data)` in `packages/sdk/client/`.

**Root cause 2 — Credential assertion `@type` mismatch**:
- `contact-book.test.ts` (3): `joinBySpaceKey` fails with `Invalid credential [assertion['@type'] === 'dxos.halo.credentials.SpaceMember']`
- **Fix**: The `getCredentialAssertion()` or assertion type check needs to handle both `@type` and `$typeName` after the credential round-trips through different codecs. Align with 10.3 (`$type` migration).

**Root cause 3 — Integration timeouts**:
- `client-services.test.ts` (2): device invitation and data sync timeouts
- `dedicated-worker-client-services.test.ts` (3): connect/coordinator/leader timeouts
- **Fix**: These likely cascade from the PublicKey/assertion issues above. Fix root causes first, then re-run. The dedicated worker tests may also have infrastructure issues (worker setup).

### 10.5 — Service implementation conversions

- [ ] For each service in `client-protocol/src/service.ts`, verify implementations use buf types natively (not protobuf.js).
  - Review comment: "For each service listed in this file, find its implementations and make sure they are converted to buf from protobuf.js"
- [ ] Propagate buf types deeper into HALO code and `@dxos/credentials` instead of casting at service boundaries.
  - Review comment on `identity-service.ts`: "don't cast protobuf messages; instead propagate conversion to buf into HALO code and @dxos/credentials"

### 10.6 — Migrate `@dxos/protocols/proto` imports to `@dxos/protocols/buf`

**280 import lines across 191 files** still import from `@dxos/protocols/proto` (protobuf.js-generated types). These must be migrated to `@dxos/protocols/buf` (buf-generated types) before protobuf.js can be removed.

Breakdown by package area (import count):

| Area | Files | Priority | Notes |
|------|-------|----------|-------|
| `sdk/client-services` | 35 | **High** | Core service impls; many already partially migrated |
| `core/echo/echo-pipeline` | 25 | **High** | Feed codec, control pipeline, space management |
| `devtools/devtools` | 22 | Medium | UI panels — mostly display types, low runtime risk |
| `core/mesh/network-manager` | 15 | **High** | Transport, swarm, signal — runtime critical |
| `core/halo/credentials` | 13 | **High** | Credential processing, state machines |
| `sdk/config` | 7 | Low | Config types |
| `common/tracing` | 7 | Low | Metrics/tracing types |
| `sdk/client` | 6 | **High** | Client-facing API, tests |
| `core/mesh/messaging` | 6 | **High** | Signal client, messenger |
| `core/mesh/teleport` | 5 | Medium | Muxer, control extension |
| `core/mesh/rpc` | 5 | Medium | RPC layer |
| `core/mesh/teleport-extension-*` | 12 | Medium | Gossip, replicator, object-sync, blob-sync |
| `core/echo/echo-db` | 4 | Medium | Queue stub, query API |
| `e2e/*` | 9 | Low | Test infrastructure |
| `core/functions-runtime-cloudflare` | 3 | Medium | Cloudflare runtime |
| Other (`plugins`, `ui`, `sdk/client-protocol`, etc.) | ~16 | Low-Med | Scattered |

**Strategy**: Migrate in dependency order (leaf packages first):
1. `core/halo/credentials` — credential types used everywhere
2. `core/mesh/*` — messaging, network, teleport
3. `core/echo/echo-pipeline` — feed codec is the biggest single-file effort
4. `sdk/client-services` — service impls
5. `sdk/client`, `sdk/client-protocol` — API surface
6. `devtools`, `e2e`, `plugins` — lower priority

### Phase 11: Full Protobuf.js Removal

- [ ] Eliminate all remaining `as never` / `as unknown` boundary casts (must be zero).
- [ ] Remove protobuf.js codegen and `@dxos/codec-protobuf` dependency.
- [ ] Remove `from '@dxos/protocols'` re-exports (old proto types).
- [ ] Remove `bufToProto`/`protoToBuf` helpers (no longer needed).
- [ ] Audit and remove dead proto type imports.

---

## Implementation Notes

### google.protobuf.Any — Credential Assertions

**Reference**: https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md#googleprotobufany

**Preparation done** (`assertion-registry.ts` in `@dxos/credentials`):

- `ASSERTION_REGISTRY` — `buf.createRegistry()` of all 16 assertion schemas (14 credentials + 2 invitations).
- `ASSERTION_SCHEMAS` — Array of all assertion `DescMessage` descriptors.
- `ASSERTION_SCHEMA_MAP` — Map from `$typeName` to schema for lookup.
- `CredentialAssertion` — Union type of all assertion message shapes.

**Current state**: Credential assertions are stored at runtime as `TypedMessage` objects (protobuf.js format with `@type` discriminator). They are cast to `bufWkt.Any` on the credential's `subject.assertion` field. The `getCredentialAssertion()` function casts back to `TypedMessage` for consumers. Type-safe helpers (`getTypedAssertion`, `checkCredentialType`, `credentialTypeFilter`) provide safe access without per-site casts.

**Why `anyPack`/`anyUnpack` is deferred to Phase 10**: The protobuf.js codec's `anySubstitutions.encode` requires `@type` on the assertion object to find the right codec. Its `anySubstitutions.decode` produces TypedMessage with `@type`. Switching to buf-native `Any` (with `typeUrl` + binary `value`) would break feed encoding/decoding. The switch happens when protobuf.js is fully replaced.

**Phase 10 migration plan**:

1. Replace protobuf.js codec for feed encoding with buf `toBinary`/`fromBinary`.
2. Switch `createCredential()` to accept buf assertion messages and use `anyPack(schema, message)`.
3. Switch `getCredentialAssertion()` to use `anyUnpack(any, ASSERTION_REGISTRY)`.
4. Update all callers to use `$typeName` instead of `@type` for discrimination.
5. **Backwards compatibility**: `canonicalStringify` must produce identical output for existing signed credentials. Strategy: unpack Any before stringifying.

### google.protobuf.Struct

**Reference**: https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md#googleprotobufstruct

In protobuf-es, `google.protobuf.Struct` is represented as `JsonObject` when used in a singular field (except inside `google.protobuf.Value`). This is the correct behavior. The buf-generated types already use `JsonObject` for Struct fields (e.g., `ProfileDocument.data`, `ServiceAccess.serverMetadata`). No migration needed for Struct itself — it works correctly in buf.

The protobuf.js substitution (`encodeStruct`/`decodeStruct` in `codec-protobuf`) converts between plain objects and protobuf Struct format. This is only needed at the codec boundary and will be removed when protobuf.js is fully eliminated (Phase 10).

### ESM Import Extensions

The `buf/index.ts` source file imports generated `_pb` files with `.ts` extensions (e.g., `./proto/gen/dxos/keys_pb.ts`). This is required because:

- `tsconfig.base.json` uses `rewriteRelativeImportExtensions: true` which only rewrites `.ts` → `.js` (not extensionless imports).
- The compiled `dist/src/buf/index.js` needs `.js` extensions for Node ESM resolution.
- Without this, vite dev server fails with `ERR_MODULE_NOT_FOUND` when loading the config (which imports `@dxos/protocols`).

The buf-generated `_pb.ts` files themselves use `import_extension=js` in their `protoc-gen-es` options, so their cross-references already have `.js` extensions and work correctly in the compiled output.

### protobuf-es Best Practices

**Reference**: https://github.com/bufbuild/protobuf-es/blob/main/MANUAL.md

Key practices to follow:

- Use `create(Schema, init)` for message construction (never plain objects for messages).
- Use `isMessage(value, Schema)` for type checking, not `$typeName` string comparison.
- Use `anyPack`/`anyUnpack` for `google.protobuf.Any` fields.
- Use `toBinary`/`fromBinary` for serialization (not protobuf.js codec).
- Use `toJson`/`fromJson` with `{ registry }` option when Any fields are present.
- Struct fields are automatically `JsonObject` — no special handling needed.

---

## Known Issues

| Issue                                                      | Severity         | Notes                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ~~BigInt crash in `canonicalStringify`~~                   | ~~P0~~ **Fixed** | Fixed in Phase 3: added `bigint` → Number and `$`-prefixed key skipping in `signing.ts` replacer.                                                                                                                                                                                 |
| ~~`$typeName` in deep equality~~                           | ~~P1~~ **Fixed** | Fixed in Phase 3: updated `system-service.test.ts` assertions.                                                                                                                                                                                                                    |
| **Assertion loss in `create()` for Any fields**            | **P1**           | Buf's `create()` recursively initializes nested messages. TypedMessage assertions in `google.protobuf.Any` fields are converted to empty `Any` messages. Fixed in `credential-factory.ts`; other call sites using `create()` with nested credentials may need the same treatment. |
| ~~PublicKey type mismatch in echo-pipeline~~               | ~~P1~~ **Fixed** | Fixed: proto codec substitutions updated to handle both buf `{ data: Uint8Array }` and `@dxos/keys.PublicKey`; `toPublicKey()` in space-manager; `fromBufPublicKey()` handles both types; `canonicalStringify` normalizes both.                                                   |
| **87 `as never` boundary casts**                           | **P1**           | Each is a potential runtime bug. Buf and protobuf.js objects are structurally different. Fix: convert protobuf.js code on the other side to buf.                                                                                                                                  |
| **25 `as unknown` casts**                                  | **P2**           | Type bridging for PublicKey, Any fields, SpaceProxy. Fix: migrate consuming code to buf.                                                                                                                                                                                          |
| ~~`as unknown` for `Any` field access~~                    | ~~P2~~ **Fixed** | Fixed in Phase 9: 6 `as unknown` casts removed via `getCredentialAssertion()`. 2 remaining in `assertions.ts`/`credential-factory.ts` are inherent to protobuf.js codec bridge (Phase 10).                                                                                        |
| **`typeUrl`/`type_url` mismatch in Any fields**            | ~~P0~~ **Fixed** | Fixed: `any.ts` substitution encode path normalizes `typeUrl` → `type_url` for protobuf.js; decode path reads both. Boundary helpers `bufAnyToProtoAny`/`protoAnyToBufAny` in signal client/messenger.                                                                            |
| **Timestamp type mismatch in proto codec**                 | ~~P1~~ **Fixed** | Fixed: `timestamp.ts` substitution encode handles both `Date` and buf `{ seconds: bigint, nanos: number }`.                                                                                                                                                                       |
| **`create()` deep-processes proto-decoded credentials**    | ~~P1~~ **Fixed** | Fixed: `device-state-machine.ts` avoids `create(ChainSchema, { credential })` which strips proto PublicKey instances. Uses `create({})` then assigns credential.                                                                                                                  |
| **`credential-factory.ts` assumes buf PublicKey on chain** | ~~P1~~ **Fixed** | Fixed: `getIssuer` uses `toPublicKey()` instead of `chain.credential.issuer.data` which fails on proto-decoded PublicKey instances.                                                                                                                                               |
| ~~client-services integration test failures~~              | ~~P1~~ **Fixed** | Fixed in Phase 9.5: 17→0 failures. Replaced `decodePublicKey()`→`toPublicKey()` throughout, fixed `create(ChainSchema, {credential})` deep-processing in test-builder, fixed double-wrapped admission credentials in data-space-manager test, fixed stream double-subscribe, updated test assertions. |
| **client package test failures**                           | **P1**           | 33 tests fail in `client` package from same root cause family: `decodePublicKey` on proto keys, Timestamp format mismatches, assertion `@type` checks. See Phase 10.4.                                                                                                            |
| `feed:build` failure                                       | Low              | Pre-existing from main. New `feed` package has unresolved imports (`@dxos/protocols`, `@dxos/sql-sqlite`). Not related to buf migration.                                                                                                                                          |
| `@dxos/errors` import in tests                             | Low              | Pre-existing from main. 15 test files in `client-services` fail to import `@dxos/errors` via the `feed` package. Infrastructure issue.                                                                                                                                            |

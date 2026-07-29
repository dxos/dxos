# Service RPC schemas — specification

> **Maintenance:** Update this file when `@dxos/protocols/rpc` service modules change their payload encoding strategy (inline Effect schema vs `protoMessage`).
>
> **Commit:** `239ad1702a` — `refactor(protocols): inline service-only RPC payloads as Effect schemas`

## Context

Client services are migrating from protobuf `Service` stubs to **effect-rpc** groups (`packages/core/protocols/src/*Service.ts`). See [rpc-effect.md](./rpc-effect.md) for the transport migration (MessagePort-native Worker platform).

Previously every RPC payload used `protoMessage(fqn)` — protobuf bytes on the wire via `service-rpc.ts`. That is correct for types shared across the codebase (client proxies, plugins, echo-client), but wasteful for **request/response messages that exist only at the service RPC boundary** (service definition + host implementation).

This change inlines those service-only messages as hand-authored **Effect `Schema.Struct`** definitions in the same module as the `Rpcs` group.

## Goal

- Service-only protobuf messages → native Effect schemas in the service module.
- Shared protobuf messages → remain `protoMessage(fqn)` (protobuf-encoded `Uint8Array`).
- JSDocs on schemas and RPC methods copied from `.proto` sources.
- No compatibility re-exports; types are exported from the service module (`DataService.SubscribeRequest`, etc.).

## Inline vs `protoMessage` rule

A message stays **`protoMessage`** when it is used **outside** the service RPC boundary — e.g. client proxies (`@dxos/client`), echo-client, plugins, devtools UI, or as a field type in non-service code.

A message is **inlined** when its only consumers are:

1. The effect-rpc service definition (`*Service.ts` `Rpcs` group), and
2. The service host implementation (`@dxos/client-services` packlets, `echo-host`, cloudflare runtime).

Nested messages used only to compose an inline parent are inlined in the same file. Fields that reference shared types use `protoMessage` or `service-schemas` helpers inside the struct.

### Examples

| Message                                    | Encoding       | Reason                                                         |
| ------------------------------------------ | -------------- | -------------------------------------------------------------- |
| `dxos.echo.service.SubscribeRequest`       | Effect schema  | Service boundary only                                          |
| `dxos.echo.service.BatchedDocumentUpdates` | `protoMessage` | Used in `echo-client` (`repo-proxy`, `documents-synchronizer`) |
| `dxos.echo.service.SpaceSyncState`         | `protoMessage` | Used in client, react-client, plugins                          |
| `dxos.client.services.Space`               | `protoMessage` | Used across client proxies and UI                              |
| `dxos.halo.credentials.Credential`         | `protoMessage` | Shared halo type                                               |
| `dxos.echo.query.QueryRequest`             | `protoMessage` | Used in echo query pipeline outside RPC                        |

## Module layout

Each service file follows this shape:

```ts
import * as Schema from 'effect/Schema';
import * as Rpc from '@effect/rpc/Rpc';
import * as RpcGroup from '@effect/rpc/RpcGroup';

import { protoMessage, serviceError } from './service-rpc.ts';
import { publicKey, protoStruct, protoTimestamp } from './service-schemas.ts'; // when needed

//
// RPC message schemas.
//

/** JSDoc from .proto */
export const SomeRequest = Schema.Struct({ ... });
export interface SomeRequest extends Schema.Schema.Type<typeof SomeRequest> {}

/**
 * Effect RPC definitions for `dxos....ServiceName`.
 * Service-only payloads use Effect schemas; shared proto types remain protobuf-encoded on the wire.
 */
export class Rpcs extends RpcGroup.make(
  /** JSDoc from .proto service method */
  Rpc.make('methodName', {
    payload: SomeRequest,                              // inline
    success: protoMessage('dxos....SharedResponse'), // shared
    error: serviceError,
  }),
).prefix('ServiceName.') {}

export interface Client extends RpcClient.RpcClient<RpcGroup.Rpcs<typeof Rpcs>> {}
export interface Handlers extends RpcGroup.HandlersFrom<RpcGroup.Rpcs<typeof Rpcs>> {}
```

Exported from `@dxos/protocols/rpc` via `packages/core/protocols/src/rpc.ts` (namespace exports: `DataService`, `FeedService`, …).

## Shared field schemas (`service-schemas.ts`)

Reusable wire schemas for protobuf substitution types that appear inside inline structs:

| Export           | Proto type                  | Wire encoding                |
| ---------------- | --------------------------- | ---------------------------- |
| `publicKey`      | `dxos.keys.PublicKey`       | `Uint8Array` (raw key bytes) |
| `protoStruct`    | `google.protobuf.Struct`    | `Record<string, unknown>`    |
| `protoTimestamp` | `google.protobuf.Timestamp` | `Date`                       |

`service-rpc.ts` is unchanged: `protoMessage` still uses the protobuf codec with substitutions; `serviceError` still round-trips `dxos.error.Error`.

## Per-service summary

| Module                 | Inlined schemas                                                                                                                                                                                                                                                                                                                                               | Still `protoMessage`                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DataService**        | `SubscribeRequest`, `UpdateSubscriptionRequest`, `CreateDocumentRequest/Response`, `DocumentUpdate`, `UpdateRequest`, `FlushRequest`, `GetDocumentHeads*`, `DocHeadsList`, `WaitUntilHeadsReplicatedRequest`, `ReIndexHeadsRequest`, `GetSpaceSyncStateRequest`                                                                                               | `BatchedDocumentUpdates`, `SpaceSyncState`                                                                                                                                                                  |
| **FeedService**        | All feed RPC types (`FeedQuery`, `QueryFeedRequest`, `FeedQueryResult`, `InsertIntoFeedRequest`, `DeleteFromFeedRequest`, `SyncFeedRequest`, `GetSyncState*`, `FeedNamespaceSyncState`)                                                                                                                                                                       | —                                                                                                                                                                                                           |
| **SystemService**      | `GetDiagnosticsRequest/Response`, `SystemStatus`, `UpdateStatusRequest`, `QueryStatusRequest/Response`, `KeyOption`                                                                                                                                                                                                                                           | `dxos.config.Config`, `Platform`                                                                                                                                                                            |
| **IdentityService**    | `CreateIdentityRequest`, `RequestRecoveryChallengeResponse`, `RecoveryCredentialData`, `CreateRecoveryCredential*`, `QueryIdentityResponse`, `SignPresentationRequest`                                                                                                                                                                                        | `Identity`, `RecoverIdentityRequest`, `ProfileDocument`, `Presentation`, `Credential`                                                                                                                       |
| **InvitationsService** | `AcceptInvitationRequest`, `AuthenticationRequest`, `CancelInvitationRequest`                                                                                                                                                                                                                                                                                 | `Invitation`, `QueryInvitationsResponse`                                                                                                                                                                    |
| **DevicesService**     | `QueryDevicesResponse`                                                                                                                                                                                                                                                                                                                                        | `Device`, `DeviceProfileDocument`                                                                                                                                                                           |
| **NetworkService**     | `ConnectionState`, `UpdateConfigRequest`, `SubscribeSwarmStateRequest`                                                                                                                                                                                                                                                                                        | `NetworkStatus`, edge signal/messenger types                                                                                                                                                                |
| **LoggingService**     | `ControlMetrics*`, `QueryMetrics*`, `Value`, `Stats`, `KeyPair`, `Metrics`                                                                                                                                                                                                                                                                                    | `QueryLogsRequest`, `LogEntry`                                                                                                                                                                              |
| **SpacesService**      | All request/response types except those containing full `Space` graphs (`CreateSpaceRequest`, `UpdateSpaceRequest`, `PostMessageRequest`, `SubscribeMessagesRequest`, `WriteCredentialsRequest`, `QueryCredentialsRequest`, `CreateEpoch*`, `UpdateMemberRoleRequest`, `AdmitContactRequest`, `JoinBySpaceKeyRequest`, `ExportSpace*`, `ImportSpace*`, enums) | `Space`, `QuerySpacesResponse`, `JoinSpaceResponse`, `Credential`, `GossipMessage`, `Contact` (field)                                                                                                       |
| **DevtoolsHost**       | Most devtools request/response types; echo snapshot subgraph (`EchoObject`, `SpaceSnapshot`, swarm info, etc.)                                                                                                                                                                                                                                                | `Event`, `StorageInfo`, `GetBlobsResponse`, `GetSnapshotsResponse`, `SubscribeTo*Response` (heavy shared payloads), `SignedMessage` (circular halo type — `protoMessage('dxos.halo.signed.SignedMessage')`) |
| **QueryService**       | — (all shared)                                                                                                                                                                                                                                                                                                                                                | `IndexConfig`, `QueryRequest`, `QueryResponse`                                                                                                                                                              |
| **ContactsService**    | —                                                                                                                                                                                                                                                                                                                                                             | `ContactBook`                                                                                                                                                                                               |
| **EdgeAgentService**   | —                                                                                                                                                                                                                                                                                                                                                             | `QueryEdgeStatusResponse`, `QueryAgentStatusResponse`                                                                                                                                                       |

## JSDoc policy

- **Message schemas:** field-level and message-level comments copied from `.proto` files (including `///` and block comments).
- **Rpcs class:** module JSDoc states encoding split (Effect vs protobuf).
- **Individual `Rpc.make` entries:** method JSDoc from `.proto` `service` block where present.
- Comments state constraints/invariants, not migration history.

## Optional fields

Proto3 optional and repeated fields map to:

- `Schema.optional(...)` for proto3 `optional` fields and repeated fields the generated TS interface
  marks optional (`field?: T[]`). Match the generated `.d.ts` optionality exactly — a `Schema.Struct`
  field that is required where the proto handler type is optional (or vice versa) fails to typecheck at
  the `Handlers` boundary.
- `mutableArray(...)` (from `service-schemas.ts`) for `repeated`, wrapped in `optional` when the array
  is optional. `Schema.Array` decodes to a `ReadonlyArray`, which is not assignable to the mutable
  `T[]` that the generated protobuf interfaces expose; handlers keep those proto types, so the inline
  payload must use a mutable array to stay structurally compatible.

`int64` / `uint64` fields decode to `string` in the generated TS interfaces — model them as
`Schema.String`, not `Schema.Number`.

Required proto3 fields (present in TS interfaces without `?`) are required in the Effect struct.

## Substitution types stay `protoMessage`

Proto messages whose fields use codec substitutions that are classes with methods (e.g.
`dxos.echo.timeframe.Timeframe`, exposed as a `frames()` accessor) cannot be modeled as inline Effect
structs — the handler produces the substitution class, not a plain object. Any response that embeds one
stays `protoMessage`:

- `DevtoolsHost.getSpaceSnapshot` / `saveSpaceSnapshot` — `protoMessage('dxos.devtools.host.GetSpaceSnapshotResponse' | 'SaveSpaceSnapshotResponse')` (the `SpaceSnapshot` subgraph embeds `Timeframe`).
- `SpacesService.createEpoch` — `protoMessage('dxos.client.services.CreateEpochResponse')` (embeds `Timeframe`).

## Generator

`scripts/gen-service-rpcs.ts` remains the **simple proto-only generator** (outputs `protoMessage` for all payloads). It is **not** aware of inline schemas.

After changing `.proto` service definitions, either:

1. Re-run the generator and manually re-apply inline schemas, or
2. Edit the service module directly (preferred for service-only messages).

Do not add an auto-generator for inline schemas without an explicit decision — the inline/keep split requires usage analysis.

## Out of scope

- Shell / iframe protobuf paths (`ShellService`, `WorkerService`, `BridgeService`) — still protobuf; see [rpc-effect.md](./rpc-effect.md) Phase B.
- Removing protobuf message types from `proto/gen` — inline schemas are parallel definitions for the RPC wire only; existing `import from '@dxos/protocols/proto/...'` at non-RPC call sites is unchanged.
- `FeedProtocol.ts` — separate edge/queue protocol; not part of client `FeedService` RPC.

## Verification

```bash
moon run protocols:compile
moon run client-protocol:compile
moon run protocols:test
```

Handler implementations continue to use proto types from `@dxos/protocols/proto/...` where not yet migrated; Effect schema types are structurally compatible at the RPC boundary.

## Related

- [worker-framework.md](./worker-framework.md) — generic `makeRpcClient` / `serveRpcGroup` over `RpcPort`
- [rpc-effect.md](./rpc-effect.md) — MessagePort-native effect-rpc transport migration

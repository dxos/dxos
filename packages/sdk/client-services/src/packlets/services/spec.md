# ServiceContext → Effect Layers

Replace `ServiceContext` (monolithic `Resource`) with a composed stack of Effect layers.

## Conventions

| Item                   | Rule                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tag name**           | Prefer interface name + `Service` (`IMetadataStore` → `IMetadataStoreService`). No interface → impl name + `Service` (`SpaceManager` → `SpaceManagerService`). |
| **Tag placement**      | Top of defining file: after interface/type, before impl class.                                                                                                 |
| **Layer placement**    | Bottom of defining file.                                                                                                                                       |
| **Layer options**      | Value-based config (flags, callbacks, runtime props) go in the layer constructor `options` object.                                                             |
| **Layer requirements** | Injected components go in the layer's `Requirements` type (resolved via `yield*` on sibling tags).                                                             |

```ts
// Tag (after interface)
export class IMetadataStoreService extends EffectContext.Tag('...')<
  IMetadataStoreService,
  IMetadataStore
>() {}

// Layer (bottom of file)
export const SqliteMetadataStoreLayer = (): Layer.Layer<
  IMetadataStoreService,
  never,
  SqlClient.SqlClient | SqlTransactionTag
> => Layer.effect(IMetadataStoreService, Effect.gen(function* () { ... }));
```

## Component map

Status: `done` | `todo`

### Storage / persistence

| Component                                | Tag                     | Layer                           | Options | Requirements                  | Status |
| ---------------------------------------- | ----------------------- | ------------------------------- | ------- | ----------------------------- | ------ |
| `IMetadataStore` / `SqliteMetadataStore` | `IMetadataStoreService` | `SqliteMetadataStoreLayer()`    | —       | `SqlClient \| SqlTransaction` | done   |
| `BlobStoreApi` / `SqliteBlobStore`       | `BlobStoreApiService`   | `SqliteBlobStoreLayer()`        | —       | `SqlClient \| SqlTransaction` | done   |
| `KeyringApi` / `SqliteKeyring`           | `KeyringApiService`     | `SqliteKeyringLayer()`          | —       | `SqlClient \| SqlTransaction` | done   |
| `SqliteStorage`                          | `SqliteStorageService`  | `SqliteStorageLayer({ path? })` | `path?` | `SqlClient \| SqlTransaction` | done   |

### Feeds

| Component                      | Tag                           | Layer                                 | Options      | Requirements                                       | Status |
| ------------------------------ | ----------------------------- | ------------------------------------- | ------------ | -------------------------------------------------- | ------ |
| `FeedFactory`                  | `FeedFactoryService`          | `FeedFactoryLayer({ hypercore? })`    | `hypercore?` | `KeyringApiService`, `FeedStorageDirectoryService` | done   |
| `FeedStore` (@dxos/feed-store) | `FeedStoreService`            | `FeedStoreLayer()`                    | —            | `FeedFactoryService`                               | done   |
| `FeedStorageDirectory`         | `FeedStorageDirectoryService` | `FeedStorageDirectoryLayer({ sub? })` | `sub?`       | `SqliteStorageService`                             | done   |

### Spaces / echo

| Component                      | Tag                              | Layer                                                                    | Options                  | Requirements                                                                                     | Status |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------ | ------ |
| `SpaceManager`                 | `SpaceManagerService`            | `SpaceManagerLayer({ disableP2pReplication? })`                          | `disableP2pReplication?` | `FeedStoreService`, `SwarmNetworkManagerService`, `IMetadataStoreService`, `BlobStoreApiService` | done   |
| `EchoHost`                     | `EchoHostService`                | `EchoHostLayer({ ...callbacks, useSubduction?, assignQueuePositions? })` | callbacks, flags         | `SqlClient \| SqlTransaction`                                                                    | done   |
| `MeshEchoReplicator`           | `AutomergeReplicatorService`     | `MeshEchoReplicatorLayer()`                                              | —                        | —                                                                                                | done   |
| `EchoEdgeReplicator`           | `EdgeAutomergeReplicatorService` | `EchoEdgeReplicatorLayer({ disableSharePolicy? })`                       | `disableSharePolicy?`    | `EdgeConnectionService`, `EdgeHttpClientService`                                                 | done   |
| `EchoEdgeSubductionReplicator` | `EdgeAutomergeReplicatorService` | `EchoEdgeSubductionReplicatorLayer({ disableSharePolicy? })`             | `disableSharePolicy?`    | `EdgeConnectionService`, `EdgeHttpClientService`                                                 | done   |

### Identity / invitations / spaces (client-services)

| Component                      | Tag                                   | Layer                                                                 | Options                                                   | Requirements                                                                                                                                                                                              | Status |
| ------------------------------ | ------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `IdentityManager`              | `IdentityManagerService`              | `IdentityManagerLayer({ devicePresence*, edgeFeatures? })`            | presence intervals, edge features                         | `IMetadataStoreService`, `KeyringApiService`, `FeedStoreService`, `SpaceManagerService`, `EdgeConnectionService?`                                                                                         | done   |
| `EdgeIdentityRecoveryManager`  | `EdgeIdentityRecoveryManagerService`  | `EdgeIdentityRecoveryManagerLayer()`                                  | — (wire `setAcceptRecoveredIdentity` after stack compose) | `KeyringApiService`, `EdgeHttpClientService?`, `IdentityManagerService`                                                                                                                                   | done   |
| `InvitationsHandler`           | `InvitationsHandlerService`           | `InvitationsHandlerLayer({ connectionProps? })`                       | `connectionProps?`                                        | `SwarmNetworkManagerService`, `EdgeHttpClientService?`                                                                                                                                                    | done   |
| `InvitationsManager`           | `InvitationsManagerService`           | `InvitationsManagerLayer({ getHandler })`                             | `getHandler` callback                                     | `InvitationsHandlerService`, `IMetadataStoreService`                                                                                                                                                      | done   |
| `DataSpaceManager`             | `DataSpaceManagerService`             | `DataSpaceManagerLayer({ runtimeProps?, edgeFeatures? })`             | runtime props, edge features                              | `SpaceManagerService`, `IMetadataStoreService`, `KeyringApiService`, `SigningContextProviderService`, `FeedStoreService`, `EchoHostService`, `InvitationsManagerService`, edge/replicator deps (optional) | done   |
| `SigningContextProvider`       | `SigningContextProviderService`       | `SigningContextProviderLayer`                                         | —                                                         | `IdentityProviderService`                                                                                                                                                                                 | done   |
| `EdgeAgentManager`             | `EdgeAgentManagerService`             | `EdgeAgentManagerLayer({ edgeFeatures? })`                            | edge features                                             | `DataSpaceManagerService`, `IdentityProviderService`, `EdgeHttpClientService?`                                                                                                                            | done   |
| `CrossDeviceSpaceSynchronizer` | `CrossDeviceSpaceSynchronizerService` | `CrossDeviceSpaceSynchronizerLayer`                                   | —                                                         | `DataSpaceManagerService`                                                                                                                                                                                 | done   |
| `IdentityProvider`             | `IdentityProviderService`             | supplied at runtime (e.g. `identityProviderFromManager`)              | —                                                         | —                                                                                                                                                                                                         | done   |
| `FeedSyncer`                   | `FeedSyncerService`                   | `FeedSyncerLayer({ peerId, syncNamespaces, getSpaceIds, ...tuning })` | peer/sync config                                          | `SqlClient \| SqlTransaction`, `FeedStoreService` (@dxos/feed), `EdgeConnectionService`                                                                                                                   | done   |

### External inputs (provided by host, not constructed inside ServiceContext)

| Component             | Tag                                               | Notes                      |
| --------------------- | ------------------------------------------------- | -------------------------- |
| `SwarmNetworkManager` | `SwarmNetworkManagerService`                      | host-provided              |
| `SignalManager`       | `SignalManagerService`                            | todo                       |
| `EdgeConnection`      | `EdgeConnectionService`                           | host-provided              |
| `EdgeHttpClient`      | `EdgeHttpClientService`                           | host-provided              |
| `RuntimeProvider`     | ambient via `SqlClient` + `SqlTransaction` layers | not a ServiceContext field |

## Target layer stack (sketch)

```ts
const ServiceContextLive = Layer.mergeAll(
  SqliteMetadataStoreLayer(),
  SqliteBlobStoreLayer(),
  SqliteKeyringLayer(),
  SqliteStorageLayer(),
  FeedFactoryLayer({ hypercore: { valueEncoding, stats: true } }),
  FeedStoreLayer(),
  SpaceManagerLayer({ disableP2pReplication }),
  EchoHostLayer({ peerIdProvider, getSpaceKeyByRootDocumentId, syncFeed, getSyncState, useSubduction }),
  // ...identity, invitations, data-space layers
).pipe(Layer.provideMerge(SqlTransaction.layer), Layer.provideMerge(sqliteLayer));
```

## Open questions

1. **Lifecycle** — identity-bound services (`DataSpaceManager`, `EdgeAgentManager`, `CrossDeviceSpaceSynchronizer`) are constructed dormant by their layers; `open`/`close` is called explicitly after identity is ready (e.g. in `_initialize`).
2. **Provider wiring** — `SigningContextProviderLayer` and `IdentityProviderService` must be provided before `DataSpaceManagerLayer` / `EdgeAgentManagerLayer` can run.
3. **Callbacks** — `EchoHost` and `InvitationsManager` need callbacks that close over other services; pass as layer options or resolve via `Effect.gen` at a higher layer.

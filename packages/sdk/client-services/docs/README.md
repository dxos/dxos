# @dxos/client-services

DXOS client services implementation

## Class Diagrams

```mermaid
classDiagram
direction TB

class ClientServicesHost {
  descriptors
  services
  open()
  close()
  _initialize()
}
ClientServicesHost --> ServiceContext : _serviceContext
ClientServicesHost --> ServiceRegistry : _serviceRegistry
class ServiceContext {
  open()
  close()
  reset()
  createIdentity()
}
ServiceContext *-- DataServiceSubscriptions : dataServiceSubscriptions
ServiceContext --> MetadataStore : metadataStore
ServiceContext --> IdentityManager : identityManager
ServiceContext --> HaloInvitationsHandler : haloInvitations
ServiceContext --> SpaceManager : spaceManager
ServiceContext --> SpaceInvitationsHandler : spaceInvitations
class DataServiceSubscriptions {
  clear()
  registerSpace()
  unregisterSpace()
  getDataService()
}
DataServiceSubscriptions *-- "Map" DataServiceHost : _spaces
class DataServiceHost {
  subscribeEntitySet()
  subscribeEntityStream()
  write()
}
DataServiceHost --> ItemManager : _itemManager
DataServiceHost --> ItemDemuxer : _itemDemuxer
class ItemManager {
  entities
  items
  links
  createItem()
  createLink()
  constructItem()
  constructLink()
  processModelMessage()
  getItem()
  getUninitializedEntities()
  deconstructItem()
  initializeModel()
}
ItemManager *-- "Map" Entity : _entities
class Entity {
  id
  type
  modelType
  modelMeta
  model
  subscribe()
}
Entity --> ItemManager : _itemManager
class ItemDemuxer {
  open()
  createSnapshot()
  createItemSnapshot()
  createLinkSnapshot()
  restoreFromSnapshot()
}
ItemDemuxer --> ItemManager : _itemManager
ItemDemuxer *-- ItemDemuxerOptions : _options
class ItemDemuxerOptions {
  <interface>
  snapshots
}
class MetadataStore {
  version
  spaces
  load()
  clear()
  getIdentityRecord()
  setIdentityRecord()
  addSpace()
}
class IdentityManager {
  identity
  open()
  close()
  createIdentity()
  acceptIdentity()
}
IdentityManager --> Identity : _identity
IdentityManager --> MetadataStore : _metadataStore
class Identity {
  authorizedDeviceKeys
  profileDocument
  controlPipeline
  haloSpaceKey
  haloGenesisFeedKey
  haloDatabase
  open()
  close()
  ready()
  getAdmissionCredentials()
  getIdentityCredentialSigner()
  getDeviceCredentialSigner()
  admitDevice()
}
Identity --> Space : _space
class Space {
  key
  isOpen
  database
  genesisFeedKey
  controlFeedKey
  dataFeedKey
  spaceState
  controlPipeline
  open()
  close()
}
Space --> ControlPipeline : _controlPipeline
Space --> SpaceProtocol : _protocol
Space --> Pipeline : _dataPipeline
Space --> DatabaseBackendHost : _databaseBackend
Space --> Database : _database
class ControlPipeline {
  spaceState
  pipeline
  setWriteFeed()
  start()
  stop()
}
ControlPipeline --> Pipeline : _pipeline
class Pipeline {
  state
  writer
  addFeed()
  setWriteFeed()
  start()
  stop()
  consume()
}
Pipeline *-- TimeframeClock : _timeframeClock
Pipeline *-- PipelineState : _state
class TimeframeClock {
  timeframe
  updateTimeframe()
  hasGaps()
  waitUntilReached()
}
class PipelineState {
  endTimeframe
  timeframe
  waitUntilTimeframe()
}
PipelineState --> TimeframeClock : _timeframeClock
class SpaceProtocol {
  peers
  addFeed()
  start()
  stop()
}
SpaceProtocol *-- ReplicatorPlugin : _replicator
SpaceProtocol --> SwarmIdentity : _swarmIdentity
SpaceProtocol --> AuthPlugin : _authPlugin
SpaceProtocol --> "Map" SpaceProtocolSession : _sessions
class ReplicatorPlugin {
  addFeed()
}
class SwarmIdentity {
  <interface>
  peerKey
  credentialProvider
  credentialAuthenticator
}
class AuthPlugin {
  createExtension()
}
AuthPlugin --> SwarmIdentity : _swarmIdentity
class SpaceProtocolSession {
  stream
  initialize()
  destroy()
}
class DatabaseBackendHost {
  isReadOnly
  echoProcessor
  open()
  close()
  getWriteStream()
  createSnapshot()
  createDataServiceHost()
}
DatabaseBackendHost --> ItemManager : _itemManager
DatabaseBackendHost --> ItemDemuxer : _itemDemuxer
DatabaseBackendHost *-- ItemDemuxerOptions : _options
class Database {
  addType()
  create()
}
class HaloInvitationsHandler {
  createInvitation()
  acceptInvitation()
}
HaloInvitationsHandler --> IdentityManager : _identityManager
class SpaceManager {
  spaces
  open()
  close()
  createSpace()
  acceptSpace()
}
SpaceManager *-- "Map" Space : _spaces
SpaceManager --> MetadataStore : _metadataStore
SpaceManager --> DataServiceSubscriptions : _dataServiceSubscriptions
SpaceManager --> SigningContext : _signingContext
class SigningContext {
  <interface>
  identityKey
  deviceKey
  credentialProvider
  credentialAuthenticator
  credentialSigner
  profile
}
class SpaceInvitationsHandler {
  createInvitation()
  acceptInvitation()
}
SpaceInvitationsHandler --> SpaceManager : _spaceManager
SpaceInvitationsHandler --> SigningContext : _signingContext
class ServiceRegistry {
  descriptors
  services
}
```

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph sdk [sdk]
  style sdk fill:transparent
  dxos/client-services("@dxos/client-services"):::root
  click dxos/client-services "dxos/dxos/tree/main/packages/sdk/client-services/docs"
  dxos/config("@dxos/config"):::def
  click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs"
  dxos/errors("@dxos/errors"):::def
  click dxos/errors "dxos/dxos/tree/main/packages/sdk/errors/docs"
end

subgraph common [common]
  style common fill:transparent
  dxos/context("@dxos/context"):::def
  click dxos/context "dxos/dxos/tree/main/packages/common/context/docs"
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/hypercore("@dxos/hypercore"):::def
  click dxos/hypercore "dxos/dxos/tree/main/packages/common/hypercore/docs"
  dxos/crypto("@dxos/crypto"):::def
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
  dxos/random-access-storage("@dxos/random-access-storage"):::def
  click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs"
  dxos/timeframe("@dxos/timeframe"):::def
  click dxos/timeframe "dxos/dxos/tree/main/packages/common/timeframe/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs"

  subgraph _ [ ]
    style _ fill:transparent
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
  end
end

subgraph core [core]
  style core fill:transparent
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"

  subgraph halo [halo]
    style halo fill:transparent
    dxos/credentials("@dxos/credentials"):::def
    click dxos/credentials "dxos/dxos/tree/main/packages/core/halo/credentials/docs"
    dxos/keyring("@dxos/keyring"):::def
    click dxos/keyring "dxos/dxos/tree/main/packages/core/halo/keyring/docs"
  end

  subgraph mesh [mesh]
    style mesh fill:transparent
    dxos/mesh-protocol("@dxos/mesh-protocol"):::def
    click dxos/mesh-protocol "dxos/dxos/tree/main/packages/core/mesh/mesh-protocol/docs"
    dxos/messaging("@dxos/messaging"):::def
    click dxos/messaging "dxos/dxos/tree/main/packages/core/mesh/messaging/docs"
    dxos/rpc("@dxos/rpc"):::def
    click dxos/rpc "dxos/dxos/tree/main/packages/core/mesh/rpc/docs"
    dxos/network-manager("@dxos/network-manager"):::def
    click dxos/network-manager "dxos/dxos/tree/main/packages/core/mesh/network-manager/docs"
    dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence"):::def
    click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-presence/docs"
    dxos/broadcast("@dxos/broadcast"):::def
    click dxos/broadcast "dxos/dxos/tree/main/packages/core/mesh/broadcast/docs"
    dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator"):::def
    click dxos/protocol-plugin-replicator "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-replicator/docs"
    dxos/network-generator("@dxos/network-generator"):::def
    click dxos/network-generator "dxos/dxos/tree/main/packages/core/mesh/network-generator/docs"
    dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc"):::def
    click dxos/protocol-plugin-rpc "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-rpc/docs"
    dxos/teleport("@dxos/teleport"):::def
    click dxos/teleport "dxos/dxos/tree/main/packages/core/mesh/teleport/docs"
    dxos/teleport-plugin-replicator("@dxos/teleport-plugin-replicator"):::def
    click dxos/teleport-plugin-replicator "dxos/dxos/tree/main/packages/core/mesh/teleport-plugin-replicator/docs"
  end

  subgraph echo [echo]
    style echo fill:transparent
    dxos/echo-db("@dxos/echo-db"):::def
    click dxos/echo-db "dxos/dxos/tree/main/packages/core/echo/echo-db/docs"
    dxos/model-factory("@dxos/model-factory"):::def
    click dxos/model-factory "dxos/dxos/tree/main/packages/core/echo/model-factory/docs"
    dxos/document-model("@dxos/document-model"):::def
    click dxos/document-model "dxos/dxos/tree/main/packages/core/echo/document-model/docs"
    dxos/text-model("@dxos/text-model"):::def
    click dxos/text-model "dxos/dxos/tree/main/packages/core/echo/text-model/docs"
  end
end

%% Links
dxos/async --> dxos/context
dxos/client-services --> dxos/config
dxos/config --> dxos/errors
dxos/config --> dxos/protocols
dxos/protocols --> dxos/hypercore
dxos/hypercore --> dxos/codec-protobuf
dxos/hypercore --> dxos/crypto
dxos/hypercore --> dxos/random-access-storage
dxos/protocols --> dxos/timeframe
dxos/credentials --> dxos/feed-store
dxos/feed-store --> dxos/hypercore
dxos/credentials --> dxos/keyring
dxos/keyring --> dxos/protocols
dxos/credentials --> dxos/mesh-protocol
dxos/mesh-protocol --> dxos/codec-protobuf
dxos/messaging --> dxos/rpc
dxos/rpc --> dxos/protocols
dxos/model-factory --> dxos/feed-store
dxos/model-factory --> dxos/protocols
dxos/echo-db --> dxos/network-manager
dxos/network-manager --> dxos/credentials
dxos/network-manager --> dxos/messaging
dxos/network-manager --> dxos/protocol-plugin-presence
dxos/protocol-plugin-presence --> dxos/broadcast
dxos/broadcast --> dxos/protocols
dxos/protocol-plugin-presence --> dxos/mesh-protocol
dxos/echo-db --> dxos/document-model
dxos/document-model --> dxos/model-factory
dxos/echo-db --> dxos/protocol-plugin-replicator
dxos/protocol-plugin-replicator --> dxos/keyring
dxos/protocol-plugin-replicator --> dxos/mesh-protocol
dxos/protocol-plugin-replicator --> dxos/network-generator
dxos/echo-db --> dxos/protocol-plugin-rpc
dxos/protocol-plugin-rpc --> dxos/mesh-protocol
dxos/protocol-plugin-rpc --> dxos/messaging
dxos/teleport --> dxos/rpc
dxos/echo-db --> dxos/teleport-plugin-replicator
dxos/teleport-plugin-replicator --> dxos/feed-store
dxos/teleport-plugin-replicator --> dxos/teleport
dxos/client-services --> dxos/text-model
dxos/text-model --> dxos/echo-db
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/broadcast`](../../../core/mesh/broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../config/docs/README.md) | &check; |
| [`@dxos/context`](../../../common/context/docs/README.md) |  |
| [`@dxos/credentials`](../../../core/halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../core/echo/echo-db/docs/README.md) | &check; |
| [`@dxos/errors`](../../errors/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) | &check; |
| [`@dxos/hypercore`](../../../common/hypercore/docs/README.md) |  |
| [`@dxos/keyring`](../../../core/halo/keyring/docs/README.md) | &check; |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/mesh-protocol`](../../../core/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../core/mesh/messaging/docs/README.md) | &check; |
| [`@dxos/model-factory`](../../../core/echo/model-factory/docs/README.md) | &check; |
| [`@dxos/network-generator`](../../../core/mesh/network-generator/docs/README.md) |  |
| [`@dxos/network-manager`](../../../core/mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/document-model`](../../../core/echo/document-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../core/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../core/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../core/mesh/protocol-plugin-rpc/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../core/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../core/mesh/rpc/docs/README.md) | &check; |
| [`@dxos/teleport`](../../../core/mesh/teleport/docs/README.md) |  |
| [`@dxos/teleport-plugin-replicator`](../../../core/mesh/teleport-plugin-replicator/docs/README.md) |  |
| [`@dxos/text-model`](../../../core/echo/text-model/docs/README.md) | &check; |
| [`@dxos/timeframe`](../../../common/timeframe/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

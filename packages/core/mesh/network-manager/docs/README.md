# @dxos/network-manager

Network Manager

## Class Diagrams

```mermaid
classDiagram
direction TB

class NetworkManager {
  signal
  topics
  connectionLog
  getSwarmMap()
  getSwarm()
  openSwarmConnection()
  closeSwarmConnection()
  start()
  destroy()
}
NetworkManager --> TransportFactory : _transportFactory
NetworkManager *-- "Map" Swarm : _swarms
NetworkManager *-- "Map" SwarmMapper : _mappers
NetworkManager --> SignalConnection : _signalConnection
NetworkManager --> ConnectionLog : _connectionLog
class TransportFactory {
<interface>
  create()
}
class Swarm {
  connections
  ownPeerId
  label
  topic
  onSwarmEvent()
  onOffer()
  onSignal()
  setTopology()
  destroy()
}
Swarm *-- "Map" Connection : _connections
Swarm --> MessageRouter : _swarmMessenger
Swarm --> Topology : _topology
Swarm --> TransportFactory : _transportFactory
class Connection {
  state
  transport
  protocol
  initiate()
  open()
  close()
  signal()
}
Connection --> Transport : _transport
Connection --> SignalMessaging : _signalMessaging
Connection --> TransportFactory : _transportFactory
class Transport {
<interface>
  closed
  connected
  errors
  signal()
  close()
}
class SignalMessaging {
<interface>
  offer()
  signal()
}
class MessageRouter {
  receiveMessage()
  signal()
  offer()
}
MessageRouter *-- "Map" OfferRecord : _offerRecords
MessageRouter --> MessageRouterOptions : { sendMessage, onSignal, onOffer, topic }
class OfferRecord {
<interface>
  resolve
  reject
}
class MessageRouterOptions {
<interface>
  sendMessage
  onOffer
  onSignal
  topic
}
class Topology {
<interface>
  init()
  update()
  onOffer()
  destroy()
}
class SwarmMapper {
  peers
  destroy()
}
SwarmMapper *-- "Map" PeerInfo : _peers
SwarmMapper --> Swarm : _swarm
class PeerInfo {
<interface>
  id
  state
  connections
}
class SignalConnection {
<interface>
  join()
  leave()
}
class ConnectionLog {
  swarms
  getSwarmInfo()
  swarmJoined()
  swarmLeft()
}
```

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph core [core]
  style core fill:transparent
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"

  subgraph mesh [mesh]
    style mesh fill:transparent
    dxos/network-manager("@dxos/network-manager"):::root
    click dxos/network-manager "dxos/dxos/tree/main/packages/core/mesh/network-manager/docs"
    dxos/mesh-protocol("@dxos/mesh-protocol"):::def
    click dxos/mesh-protocol "dxos/dxos/tree/main/packages/core/mesh/mesh-protocol/docs"
    dxos/messaging("@dxos/messaging"):::def
    click dxos/messaging "dxos/dxos/tree/main/packages/core/mesh/messaging/docs"
    dxos/rpc("@dxos/rpc"):::def
    click dxos/rpc "dxos/dxos/tree/main/packages/core/mesh/rpc/docs"
    dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence"):::def
    click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-presence/docs"
    dxos/broadcast("@dxos/broadcast"):::def
    click dxos/broadcast "dxos/dxos/tree/main/packages/core/mesh/broadcast/docs"
  end

  subgraph halo [halo]
    style halo fill:transparent
    dxos/credentials("@dxos/credentials"):::def
    click dxos/credentials "dxos/dxos/tree/main/packages/core/halo/credentials/docs"
    dxos/keyring("@dxos/keyring"):::def
    click dxos/keyring "dxos/dxos/tree/main/packages/core/halo/keyring/docs"
  end
end

subgraph common [common]
  style common fill:transparent
  dxos/context("@dxos/context"):::def
  click dxos/context "dxos/dxos/tree/main/packages/common/context/docs"
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/crypto("@dxos/crypto"):::def
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs"
  dxos/hypercore("@dxos/hypercore"):::def
  click dxos/hypercore "dxos/dxos/tree/main/packages/common/hypercore/docs"
  dxos/random-access-storage("@dxos/random-access-storage"):::def
  click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs"
  dxos/timeframe("@dxos/timeframe"):::def
  click dxos/timeframe "dxos/dxos/tree/main/packages/common/timeframe/docs"

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

%% Links
dxos/async --> dxos/context
dxos/network-manager --> dxos/credentials
dxos/credentials --> dxos/feed-store
dxos/feed-store --> dxos/hypercore
dxos/hypercore --> dxos/codec-protobuf
dxos/hypercore --> dxos/crypto
dxos/hypercore --> dxos/random-access-storage
dxos/credentials --> dxos/keyring
dxos/keyring --> dxos/protocols
dxos/protocols --> dxos/hypercore
dxos/protocols --> dxos/timeframe
dxos/credentials --> dxos/mesh-protocol
dxos/mesh-protocol --> dxos/codec-protobuf
dxos/network-manager --> dxos/messaging
dxos/messaging --> dxos/rpc
dxos/rpc --> dxos/protocols
dxos/network-manager --> dxos/protocol-plugin-presence
dxos/protocol-plugin-presence --> dxos/broadcast
dxos/broadcast --> dxos/protocols
dxos/protocol-plugin-presence --> dxos/mesh-protocol
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../common/async/docs/README.md) | &check; |
| [`@dxos/broadcast`](../../broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/context`](../../../../common/context/docs/README.md) |  |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../../common/debug/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../../common/feed-store/docs/README.md) |  |
| [`@dxos/hypercore`](../../../../common/hypercore/docs/README.md) |  |
| [`@dxos/keyring`](../../../halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../../common/log/docs/README.md) | &check; |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/messaging`](../../messaging/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../protocol-plugin-presence/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/rpc`](../../rpc/docs/README.md) | &check; |
| [`@dxos/timeframe`](../../../../common/timeframe/docs/README.md) |  |
| [`@dxos/util`](../../../../common/util/docs/README.md) | &check; |

# @dxos/devtools



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph devtools [devtools]
  style devtools fill:#badade,stroke:#fff
  dxos/devtools("@dxos/devtools"):::root
  click dxos/devtools "dxos/dxos/tree/main/packages/devtools/devtools/docs"
  dxos/devtools-mesh("@dxos/devtools-mesh"):::def
  click dxos/devtools-mesh "dxos/dxos/tree/main/packages/devtools/devtools-mesh/docs"
end

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/crypto("@dxos/crypto"):::def
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs"
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs"
  dxos/rpc("@dxos/rpc"):::def
  click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs"
  dxos/random-access-storage("@dxos/random-access-storage"):::def
  click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs"
  dxos/rpc-tunnel("@dxos/rpc-tunnel"):::def
  click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/common/rpc-tunnel/docs"
  dxos/react-async("@dxos/react-async"):::def
  click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs"

  subgraph common-excluded [common-excluded]
    style common-excluded fill:#debac2,stroke:#333,stroke-dashed:5 5
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
    dxos/testutils("@dxos/testutils"):::def
    click dxos/testutils "dxos/dxos/tree/main/packages/common/testutils/docs"
  end
end

subgraph sdk [sdk]
  style sdk fill:#dddeba,stroke:#fff
  dxos/client("@dxos/client"):::def
  click dxos/client "dxos/dxos/tree/main/packages/sdk/client/docs"
  dxos/client-services("@dxos/client-services"):::def
  click dxos/client-services "dxos/dxos/tree/main/packages/sdk/client-services/docs"
  dxos/config("@dxos/config"):::def
  click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs"
  dxos/react-components("@dxos/react-components"):::def
  click dxos/react-components "dxos/dxos/tree/main/packages/sdk/react-components/docs"
  dxos/react-toolkit("@dxos/react-toolkit"):::def
  click dxos/react-toolkit "dxos/dxos/tree/main/packages/sdk/react-toolkit/docs"
  dxos/react-registry-client("@dxos/react-registry-client"):::def
  click dxos/react-registry-client "dxos/dxos/tree/main/packages/sdk/react-registry-client/docs"
  dxos/registry-client("@dxos/registry-client"):::def
  click dxos/registry-client "dxos/dxos/tree/main/packages/sdk/registry-client/docs"
  dxos/react-client("@dxos/react-client"):::def
  click dxos/react-client "dxos/dxos/tree/main/packages/sdk/react-client/docs"
end

subgraph halo [halo]
  style halo fill:#cabade,stroke:#fff
  dxos/credentials("@dxos/credentials"):::def
  click dxos/credentials "dxos/dxos/tree/main/packages/halo/credentials/docs"
  dxos/halo-protocol("@dxos/halo-protocol"):::def
  click dxos/halo-protocol "dxos/dxos/tree/main/packages/halo/halo-protocol/docs"
end

subgraph mesh [mesh]
  style mesh fill:#b3e6c0,stroke:#fff
  dxos/mesh-protocol("@dxos/mesh-protocol"):::def
  click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs"
  dxos/messaging("@dxos/messaging"):::def
  click dxos/messaging "dxos/dxos/tree/main/packages/mesh/messaging/docs"
  dxos/network-manager("@dxos/network-manager"):::def
  click dxos/network-manager "dxos/dxos/tree/main/packages/mesh/network-manager/docs"
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence"):::def
  click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs"
  dxos/broadcast("@dxos/broadcast"):::def
  click dxos/broadcast "dxos/dxos/tree/main/packages/mesh/broadcast/docs"
  dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator"):::def
  click dxos/protocol-plugin-replicator "dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs"
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc"):::def
  click dxos/protocol-plugin-rpc "dxos/dxos/tree/main/packages/mesh/protocol-plugin-rpc/docs"
end

subgraph echo [echo]
  style echo fill:#b3cae6,stroke:#fff
  dxos/echo-db("@dxos/echo-db"):::def
  click dxos/echo-db "dxos/dxos/tree/main/packages/echo/echo-db/docs"
  dxos/model-factory("@dxos/model-factory"):::def
  click dxos/model-factory "dxos/dxos/tree/main/packages/echo/model-factory/docs"
  dxos/object-model("@dxos/object-model"):::def
  click dxos/object-model "dxos/dxos/tree/main/packages/echo/object-model/docs"
  dxos/messenger-model("@dxos/messenger-model"):::def
  click dxos/messenger-model "dxos/dxos/tree/main/packages/echo/messenger-model/docs"
  dxos/text-model("@dxos/text-model"):::def
  click dxos/text-model "dxos/dxos/tree/main/packages/echo/text-model/docs"
end

subgraph gem [gem]
  style gem fill:#b3c7e6,stroke:#fff
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs"
  dxos/gem-spore("@dxos/gem-spore"):::def
  click dxos/gem-spore "dxos/dxos/tree/main/packages/gem/gem-spore/docs"
end

subgraph bot [bot]
  style bot fill:#c2b3e6,stroke:#fff
  dxos/bot-factory-client("@dxos/bot-factory-client"):::def
  click dxos/bot-factory-client "dxos/dxos/tree/main/packages/bot/bot-factory-client/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/client --> dxos/client-services
dxos/credentials --> dxos/crypto
dxos/credentials --> dxos/feed-store
dxos/credentials --> dxos/mesh-protocol
dxos/mesh-protocol --> dxos/codec-protobuf
dxos/credentials --> dxos/protocols
dxos/protocols --> dxos/codec-protobuf
dxos/client-services --> dxos/config
dxos/config --> dxos/protocols
dxos/client-services --> dxos/echo-db
dxos/echo-db --> dxos/halo-protocol
dxos/halo-protocol --> dxos/protocols
dxos/messaging --> dxos/rpc
dxos/rpc --> dxos/protocols
dxos/model-factory --> dxos/feed-store
dxos/model-factory --> dxos/protocols
dxos/echo-db --> dxos/network-manager
dxos/network-manager --> dxos/credentials
dxos/network-manager --> dxos/messaging
dxos/network-manager --> dxos/protocol-plugin-presence
dxos/protocol-plugin-presence --> dxos/broadcast
dxos/broadcast --> dxos/crypto
dxos/broadcast --> dxos/protocols
dxos/protocol-plugin-presence --> dxos/mesh-protocol
dxos/echo-db --> dxos/object-model
dxos/object-model --> dxos/model-factory
dxos/echo-db --> dxos/protocol-plugin-replicator
dxos/protocol-plugin-replicator --> dxos/mesh-protocol
dxos/echo-db --> dxos/random-access-storage
dxos/echo-db --> dxos/protocol-plugin-rpc
dxos/protocol-plugin-rpc --> dxos/messaging
dxos/protocol-plugin-rpc --> dxos/mesh-protocol
dxos/client --> dxos/rpc-tunnel
dxos/rpc-tunnel --> dxos/rpc
dxos/devtools --> dxos/devtools-mesh
dxos/devtools-mesh --> dxos/gem-spore
dxos/gem-spore --> dxos/gem-core
dxos/devtools-mesh --> dxos/react-components
dxos/react-components --> dxos/react-async
dxos/devtools-mesh --> dxos/react-toolkit
dxos/react-toolkit --> dxos/react-async
dxos/react-toolkit --> dxos/react-registry-client
dxos/react-registry-client --> dxos/registry-client
dxos/registry-client --> dxos/client
dxos/devtools --> dxos/messenger-model
dxos/messenger-model --> dxos/model-factory
dxos/devtools --> dxos/react-client
dxos/react-client --> dxos/bot-factory-client
dxos/bot-factory-client --> dxos/protocol-plugin-rpc
dxos/react-client --> dxos/client
dxos/react-client --> dxos/react-async
dxos/devtools --> dxos/text-model
dxos/text-model --> dxos/echo-db
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../sdk/client-services/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../sdk/config/docs/README.md) |  |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/devtools-mesh`](../../devtools-mesh/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) | &check; |
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) |  |
| [`@dxos/gem-spore`](../../../gem/gem-spore/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) | &check; |
| [`@dxos/messenger-model`](../../../echo/messenger-model/docs/README.md) | &check; |
| [`@dxos/model-factory`](../../../echo/model-factory/docs/README.md) | &check; |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/object-model`](../../../echo/object-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) | &check; |
| [`@dxos/react-client`](../../../sdk/react-client/docs/README.md) | &check; |
| [`@dxos/react-components`](../../../sdk/react-components/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../../sdk/react-registry-client/docs/README.md) | &check; |
| [`@dxos/react-toolkit`](../../../sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../common/testutils/docs/README.md) |  |
| [`@dxos/text-model`](../../../echo/text-model/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

# @dxos/kitchen-sink

Comprehensive set of demos.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph experimental [experimental]
  style experimental fill:transparent
  dxos/kitchen-sink("@dxos/kitchen-sink"):::root
  click dxos/kitchen-sink "dxos/dxos/tree/main/packages/experimental/kitchen-sink/docs"
  dxos/client-testing("@dxos/client-testing"):::def
  click dxos/client-testing "dxos/dxos/tree/main/packages/experimental/client-testing/docs"
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/experimental/gem-core/docs"
  dxos/gem-spore("@dxos/gem-spore"):::def
  click dxos/gem-spore "dxos/dxos/tree/main/packages/experimental/gem-spore/docs"
  dxos/react-client-testing("@dxos/react-client-testing"):::def
  click dxos/react-client-testing "dxos/dxos/tree/main/packages/experimental/react-client-testing/docs"
  dxos/react-echo-graph("@dxos/react-echo-graph"):::def
  click dxos/react-echo-graph "dxos/dxos/tree/main/packages/experimental/react-echo-graph/docs"
  dxos/react-ipfs("@dxos/react-ipfs"):::def
  click dxos/react-ipfs "dxos/dxos/tree/main/packages/experimental/react-ipfs/docs"
  dxos/react-registry-client("@dxos/react-registry-client"):::def
  click dxos/react-registry-client "dxos/dxos/tree/main/packages/experimental/react-registry-client/docs"
  dxos/registry-client("@dxos/registry-client"):::def
  click dxos/registry-client "dxos/dxos/tree/main/packages/experimental/registry-client/docs"
end

subgraph sdk [sdk]
  style sdk fill:transparent
  dxos/client("@dxos/client"):::def
  click dxos/client "dxos/dxos/tree/main/packages/sdk/client/docs"
  dxos/client-services("@dxos/client-services"):::def
  click dxos/client-services "dxos/dxos/tree/main/packages/sdk/client-services/docs"
  dxos/config("@dxos/config"):::def
  click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs"
  dxos/react-client("@dxos/react-client"):::def
  click dxos/react-client "dxos/dxos/tree/main/packages/sdk/react-client/docs"
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
  dxos/react-async("@dxos/react-async"):::def
  click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs"

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
    dxos/rpc-tunnel("@dxos/rpc-tunnel"):::def
    click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/core/mesh/rpc-tunnel/docs"
  end

  subgraph echo [echo]
    style echo fill:transparent
    dxos/echo-db("@dxos/echo-db"):::def
    click dxos/echo-db "dxos/dxos/tree/main/packages/core/echo/echo-db/docs"
    dxos/model-factory("@dxos/model-factory"):::def
    click dxos/model-factory "dxos/dxos/tree/main/packages/core/echo/model-factory/docs"
    dxos/object-model("@dxos/object-model"):::def
    click dxos/object-model "dxos/dxos/tree/main/packages/core/echo/object-model/docs"
    dxos/text-model("@dxos/text-model"):::def
    click dxos/text-model "dxos/dxos/tree/main/packages/core/echo/text-model/docs"
  end
end

subgraph deprecated [deprecated]
  style deprecated fill:transparent
  dxos/react-components("@dxos/react-components"):::def
  click dxos/react-components "dxos/dxos/tree/main/packages/deprecated/react-components/docs"
  dxos/react-toolkit("@dxos/react-toolkit"):::def
  click dxos/react-toolkit "dxos/dxos/tree/main/packages/deprecated/react-toolkit/docs"
end

%% Links
dxos/async --> dxos/context
dxos/client --> dxos/client-services
dxos/client-services --> dxos/config
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
dxos/echo-db --> dxos/object-model
dxos/object-model --> dxos/model-factory
dxos/echo-db --> dxos/protocol-plugin-replicator
dxos/protocol-plugin-replicator --> dxos/keyring
dxos/protocol-plugin-replicator --> dxos/mesh-protocol
dxos/protocol-plugin-replicator --> dxos/network-generator
dxos/echo-db --> dxos/protocol-plugin-rpc
dxos/protocol-plugin-rpc --> dxos/mesh-protocol
dxos/protocol-plugin-rpc --> dxos/messaging
dxos/client-services --> dxos/text-model
dxos/text-model --> dxos/echo-db
dxos/client --> dxos/rpc-tunnel
dxos/rpc-tunnel --> dxos/rpc
dxos/kitchen-sink --> dxos/client-testing
dxos/client-testing --> dxos/client
dxos/gem-spore --> dxos/gem-core
dxos/react-client --> dxos/client
dxos/react-client --> dxos/react-async
dxos/kitchen-sink --> dxos/react-client-testing
dxos/kitchen-sink --> dxos/react-components
dxos/react-components --> dxos/react-async
dxos/kitchen-sink --> dxos/react-echo-graph
dxos/react-echo-graph --> dxos/gem-spore
dxos/kitchen-sink --> dxos/react-ipfs
dxos/react-ipfs --> dxos/react-client
dxos/kitchen-sink --> dxos/react-toolkit
dxos/react-toolkit --> dxos/react-async
dxos/react-toolkit --> dxos/react-registry-client
dxos/react-registry-client --> dxos/registry-client
dxos/registry-client --> dxos/client
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../../core/mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../sdk/client-services/docs/README.md) |  |
| [`@dxos/client-testing`](../../client-testing/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/context`](../../../common/context/docs/README.md) |  |
| [`@dxos/credentials`](../../../core/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/echo-db`](../../../core/echo/echo-db/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) |  |
| [`@dxos/gem-core`](../../gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../gem-spore/docs/README.md) | &check; |
| [`@dxos/hypercore`](../../../common/hypercore/docs/README.md) |  |
| [`@dxos/keyring`](../../../core/halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../core/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../core/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../core/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-generator`](../../../core/mesh/network-generator/docs/README.md) |  |
| [`@dxos/network-manager`](../../../core/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../core/echo/object-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../core/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../core/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../core/mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../core/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) |  |
| [`@dxos/react-client`](../../../sdk/react-client/docs/README.md) | &check; |
| [`@dxos/react-client-testing`](../../react-client-testing/docs/README.md) | &check; |
| [`@dxos/react-components`](../../../deprecated/react-components/docs/README.md) | &check; |
| [`@dxos/react-echo-graph`](../../react-echo-graph/docs/README.md) | &check; |
| [`@dxos/react-ipfs`](../../react-ipfs/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../deprecated/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../registry-client/docs/README.md) |  |
| [`@dxos/rpc`](../../../core/mesh/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../core/mesh/rpc-tunnel/docs/README.md) |  |
| [`@dxos/text-model`](../../../core/echo/text-model/docs/README.md) |  |
| [`@dxos/timeframe`](../../../common/timeframe/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

# @dxos/kitchen-sink

Comprehensive set of demos.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/bot-factory-client --> dxos/protocol-plugin-rpc;
dxos/broadcast --> dxos/crypto;
dxos/client --> dxos/config;
dxos/client --> dxos/echo-db;
dxos/client --> dxos/rpc-tunnel;
dxos/client-testing --> dxos/client;
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/crypto --> dxos/protocols;
dxos/echo-db --> dxos/network-manager;
dxos/echo-db --> dxos/object-model;
dxos/echo-db --> dxos/protocol-plugin-replicator;
dxos/echo-db --> dxos/random-access-storage;
dxos/echo-protocol --> dxos/credentials;
dxos/echo-testing --> dxos/echo-db;
dxos/kitchen-sink --> dxos/client-testing;
dxos/kitchen-sink --> dxos/echo-testing;
dxos/kitchen-sink --> dxos/react-client-testing;
dxos/kitchen-sink --> dxos/react-components;
dxos/kitchen-sink --> dxos/react-echo-graph;
dxos/kitchen-sink --> dxos/react-ipfs;
dxos/kitchen-sink --> dxos/react-toolkit;
dxos/messaging --> dxos/rpc;
dxos/network-manager --> dxos/credentials;
dxos/network-manager --> dxos/messaging;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/object-model --> dxos/echo-protocol;
dxos/object-model --> dxos/model-factory;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/protocol-plugin-replicator --> dxos/mesh-protocol;
dxos/protocol-plugin-rpc --> dxos/mesh-protocol;
dxos/protocol-plugin-rpc --> dxos/messaging;
dxos/protocols --> dxos/codec-protobuf;
dxos/react-client --> dxos/bot-factory-client;
dxos/react-client --> dxos/client;
dxos/react-client --> dxos/react-async;
dxos/react-components --> dxos/react-async;
dxos/react-ipfs --> dxos/react-client;
dxos/react-registry-client --> dxos/registry-client;
dxos/react-toolkit --> dxos/react-async;
dxos/react-toolkit --> dxos/react-registry-client;
dxos/registry-client --> dxos/config;
dxos/rpc-tunnel --> dxos/rpc;
dxos/util --> dxos/protocols;

%% Sections
subgraph experimental
  style experimental fill:#b8e6b3,stroke:#fff;

  dxos/kitchen-sink("@dxos/kitchen-sink")
end

subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/client("@dxos/client")
  dxos/client-testing("@dxos/client-testing")
  dxos/config("@dxos/config")
  dxos/react-client("@dxos/react-client")
  dxos/react-client-testing("@dxos/react-client-testing")
  dxos/react-components("@dxos/react-components")
  dxos/react-echo-graph("@dxos/react-echo-graph")
  dxos/react-ipfs("@dxos/react-ipfs")
  dxos/react-registry-client("@dxos/react-registry-client")
  dxos/react-toolkit("@dxos/react-toolkit")
  dxos/registry-client("@dxos/registry-client")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/protocols("@dxos/protocols")
  dxos/random-access-storage("@dxos/random-access-storage")
  dxos/react-async("@dxos/react-async")
  dxos/rpc("@dxos/rpc")
  dxos/rpc-tunnel("@dxos/rpc-tunnel")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/log("@dxos/log")
    dxos/util("@dxos/util")
  end
end

subgraph echo
  style echo fill:#b3cae6,stroke:#fff;

  dxos/echo-db("@dxos/echo-db")
  dxos/echo-protocol("@dxos/echo-protocol")
  dxos/echo-testing("@dxos/echo-testing")
  dxos/feed-store("@dxos/feed-store")
  dxos/model-factory("@dxos/model-factory")
  dxos/object-model("@dxos/object-model")
end

subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/credentials("@dxos/credentials")
end

subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/broadcast("@dxos/broadcast")
  dxos/mesh-protocol("@dxos/mesh-protocol")
  dxos/messaging("@dxos/messaging")
  dxos/network-manager("@dxos/network-manager")
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence")
  dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator")
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc")
end

subgraph bot
  style bot fill:#c2b3e6,stroke:#fff;

  dxos/bot-factory-client("@dxos/bot-factory-client")
end


%% Hyperlinks
click dxos/async href "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/bot-factory-client href "https:/github.com/dxos/dxos/tree/main/packages/bot/bot-factory-client/docs";
click dxos/client href "https:/github.com/dxos/dxos/tree/main/packages/sdk/client/docs";
click dxos/client-testing href "https:/github.com/dxos/dxos/tree/main/packages/sdk/client-testing/docs";
click dxos/codec-protobuf href "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config href "https:/github.com/dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/credentials href "https:/github.com/dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto href "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug href "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/echo-db href "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-db/docs";
click dxos/echo-protocol href "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-protocol/docs";
click dxos/echo-testing href "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-testing/docs";
click dxos/feed-store href "https:/github.com/dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/log href "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol href "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/messaging href "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/model-factory href "https:/github.com/dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/network-manager href "https:/github.com/dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/object-model href "https:/github.com/dxos/dxos/tree/main/packages/echo/object-model/docs";
click dxos/protocol-plugin-presence href "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocol-plugin-replicator href "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs";
click dxos/protocols href "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/random-access-storage href "https:/github.com/dxos/dxos/tree/main/packages/common/random-access-storage/docs";
click dxos/react-async href "https:/github.com/dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/react-client href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-client/docs";
click dxos/react-client-testing href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-client-testing/docs";
click dxos/react-components href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-components/docs";
click dxos/react-echo-graph href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-echo-graph/docs";
click dxos/react-ipfs href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-ipfs/docs";
click dxos/react-registry-client href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-registry-client/docs";
click dxos/react-toolkit href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-toolkit/docs";
click dxos/rpc href "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/rpc-tunnel href "https:/github.com/dxos/dxos/tree/main/packages/common/rpc-tunnel/docs";
click dxos/util href "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/kitchen-sink:::rootNode

dxos/async:::defaultNode
dxos/bot-factory-client:::defaultNode
dxos/client:::defaultNode
dxos/client-testing:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/credentials:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/echo-db:::defaultNode
dxos/echo-protocol:::defaultNode
dxos/echo-testing:::defaultNode
dxos/feed-store:::defaultNode
dxos/log:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/messaging:::defaultNode
dxos/model-factory:::defaultNode
dxos/network-manager:::defaultNode
dxos/object-model:::defaultNode
dxos/protocol-plugin-presence:::defaultNode
dxos/protocol-plugin-replicator:::defaultNode
dxos/protocols:::defaultNode
dxos/random-access-storage:::defaultNode
dxos/react-async:::defaultNode
dxos/react-client:::defaultNode
dxos/react-client-testing:::defaultNode
dxos/react-components:::defaultNode
dxos/react-echo-graph:::defaultNode
dxos/react-ipfs:::defaultNode
dxos/react-registry-client:::defaultNode
dxos/react-toolkit:::defaultNode
dxos/rpc:::defaultNode
dxos/rpc-tunnel:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../packages/common/async/docs/README.md) |  |
| [`@dxos/bot-factory-client`](../../../../packages/bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/client`](../../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/client-testing`](../../../../packages/sdk/client-testing/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../../packages/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../../packages/common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../../packages/common/debug/docs/README.md) |  |
| [`@dxos/echo-db`](../../../../packages/echo/echo-db/docs/README.md) | &check; |
| [`@dxos/echo-protocol`](../../../../packages/echo/echo-protocol/docs/README.md) | &check; |
| [`@dxos/echo-testing`](../../../../packages/echo/echo-testing/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../../packages/echo/feed-store/docs/README.md) |  |
| [`@dxos/log`](../../../../packages/common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../../packages/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../../packages/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../../packages/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../../packages/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../../packages/echo/object-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../../packages/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../../packages/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocols`](../../../../packages/common/protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../../../packages/common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../../packages/common/react-async/docs/README.md) |  |
| [`@dxos/react-client`](../../../../packages/sdk/react-client/docs/README.md) | &check; |
| [`@dxos/react-client-testing`](../../../../packages/sdk/react-client-testing/docs/README.md) | &check; |
| [`@dxos/react-components`](../../../../packages/sdk/react-components/docs/README.md) | &check; |
| [`@dxos/react-echo-graph`](../../../../packages/sdk/react-echo-graph/docs/README.md) | &check; |
| [`@dxos/react-ipfs`](../../../../packages/sdk/react-ipfs/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../../../packages/sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../../packages/sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../../packages/common/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../../packages/common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/util`](../../../../packages/common/util/docs/README.md) | &check; |

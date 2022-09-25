# @dxos/devtools-extension



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/bot-factory-client --> dxos/protocol-plugin-rpc;
dxos/broadcast --> dxos/crypto;
dxos/broadcast --> dxos/protocols;
dxos/client --> dxos/client-services;
dxos/client --> dxos/rpc-tunnel;
dxos/client-services --> dxos/config;
dxos/client-services --> dxos/echo-db;
dxos/config --> dxos/protocols;
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/devtools --> dxos/devtools-mesh;
dxos/devtools --> dxos/messenger-model;
dxos/devtools --> dxos/react-client;
dxos/devtools --> dxos/text-model;
dxos/devtools-extension --> dxos/devtools;
dxos/devtools-mesh --> dxos/react-components;
dxos/devtools-mesh --> dxos/react-toolkit;
dxos/echo-db --> dxos/halo-protocol;
dxos/echo-db --> dxos/network-manager;
dxos/echo-db --> dxos/object-model;
dxos/echo-db --> dxos/protocol-plugin-replicator;
dxos/echo-db --> dxos/protocol-plugin-rpc;
dxos/feed-store --> dxos/keyring;
dxos/halo-protocol --> dxos/keyring;
dxos/keyring --> dxos/protocols;
dxos/keyring --> dxos/random-access-storage;
dxos/mesh-protocol --> dxos/codec-protobuf;
dxos/messaging --> dxos/rpc;
dxos/messenger-model --> dxos/model-factory;
dxos/model-factory --> dxos/feed-store;
dxos/network-manager --> dxos/credentials;
dxos/network-manager --> dxos/messaging;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/object-model --> dxos/model-factory;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/protocol-plugin-replicator --> dxos/keyring;
dxos/protocol-plugin-replicator --> dxos/mesh-protocol;
dxos/protocol-plugin-rpc --> dxos/mesh-protocol;
dxos/protocol-plugin-rpc --> dxos/messaging;
dxos/protocols --> dxos/codec-protobuf;
dxos/react-client --> dxos/bot-factory-client;
dxos/react-client --> dxos/client;
dxos/react-client --> dxos/react-async;
dxos/react-components --> dxos/react-async;
dxos/react-registry-client --> dxos/registry-client;
dxos/react-toolkit --> dxos/react-async;
dxos/react-toolkit --> dxos/react-registry-client;
dxos/registry-client --> dxos/client;
dxos/rpc --> dxos/protocols;
dxos/rpc-tunnel --> dxos/rpc;
dxos/text-model --> dxos/echo-db;

%% Sections
subgraph devtools
  style devtools fill:#badade,stroke:#fff;

  dxos/devtools("@dxos/devtools")
  dxos/devtools-extension("@dxos/devtools-extension")
  dxos/devtools-mesh("@dxos/devtools-mesh")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/feed-store("@dxos/feed-store")
  dxos/protocols("@dxos/protocols")
  dxos/random-access-storage("@dxos/random-access-storage")
  dxos/react-async("@dxos/react-async")
  dxos/rpc("@dxos/rpc")
  dxos/rpc-tunnel("@dxos/rpc-tunnel")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/keys("@dxos/keys")
    dxos/log("@dxos/log")
    dxos/testutils("@dxos/testutils")
    dxos/util("@dxos/util")
  end
end

subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/client("@dxos/client")
  dxos/client-services("@dxos/client-services")
  dxos/config("@dxos/config")
  dxos/react-client("@dxos/react-client")
  dxos/react-components("@dxos/react-components")
  dxos/react-registry-client("@dxos/react-registry-client")
  dxos/react-toolkit("@dxos/react-toolkit")
  dxos/registry-client("@dxos/registry-client")
end

subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/credentials("@dxos/credentials")
  dxos/halo-protocol("@dxos/halo-protocol")
  dxos/keyring("@dxos/keyring")
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

subgraph echo
  style echo fill:#b3cae6,stroke:#fff;

  dxos/echo-db("@dxos/echo-db")
  dxos/messenger-model("@dxos/messenger-model")
  dxos/model-factory("@dxos/model-factory")
  dxos/object-model("@dxos/object-model")
  dxos/text-model("@dxos/text-model")
end

subgraph bot
  style bot fill:#c2b3e6,stroke:#fff;

  dxos/bot-factory-client("@dxos/bot-factory-client")
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/bot-factory-client "dxos/dxos/tree/main/packages/bot/bot-factory-client/docs";
click dxos/broadcast "dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/client "dxos/dxos/tree/main/packages/sdk/client/docs";
click dxos/client-services "dxos/dxos/tree/main/packages/sdk/client-services/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/credentials "dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/devtools "dxos/dxos/tree/main/packages/devtools/devtools/docs";
click dxos/devtools-mesh "dxos/dxos/tree/main/packages/devtools/devtools-mesh/docs";
click dxos/echo-db "dxos/dxos/tree/main/packages/echo/echo-db/docs";
click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs";
click dxos/halo-protocol "dxos/dxos/tree/main/packages/halo/halo-protocol/docs";
click dxos/keyring "dxos/dxos/tree/main/packages/halo/keyring/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/messaging "dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/messenger-model "dxos/dxos/tree/main/packages/echo/messenger-model/docs";
click dxos/model-factory "dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/network-manager "dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/object-model "dxos/dxos/tree/main/packages/echo/object-model/docs";
click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocol-plugin-replicator "dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs";
click dxos/protocol-plugin-rpc "dxos/dxos/tree/main/packages/mesh/protocol-plugin-rpc/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs";
click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/react-client "dxos/dxos/tree/main/packages/sdk/react-client/docs";
click dxos/react-components "dxos/dxos/tree/main/packages/sdk/react-components/docs";
click dxos/react-registry-client "dxos/dxos/tree/main/packages/sdk/react-registry-client/docs";
click dxos/react-toolkit "dxos/dxos/tree/main/packages/sdk/react-toolkit/docs";
click dxos/registry-client "dxos/dxos/tree/main/packages/sdk/registry-client/docs";
click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/common/rpc-tunnel/docs";
click dxos/testutils "dxos/dxos/tree/main/packages/common/testutils/docs";
click dxos/text-model "dxos/dxos/tree/main/packages/echo/text-model/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/devtools-extension:::rootNode

dxos/async:::defaultNode
dxos/bot-factory-client:::defaultNode
dxos/broadcast:::defaultNode
dxos/client:::defaultNode
dxos/client-services:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/credentials:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/devtools:::defaultNode
dxos/devtools-mesh:::defaultNode
dxos/echo-db:::defaultNode
dxos/feed-store:::defaultNode
dxos/halo-protocol:::defaultNode
dxos/keyring:::defaultNode
dxos/keys:::defaultNode
dxos/log:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/messaging:::defaultNode
dxos/messenger-model:::defaultNode
dxos/model-factory:::defaultNode
dxos/network-manager:::defaultNode
dxos/object-model:::defaultNode
dxos/protocol-plugin-presence:::defaultNode
dxos/protocol-plugin-replicator:::defaultNode
dxos/protocol-plugin-rpc:::defaultNode
dxos/protocols:::defaultNode
dxos/random-access-storage:::defaultNode
dxos/react-async:::defaultNode
dxos/react-client:::defaultNode
dxos/react-components:::defaultNode
dxos/react-registry-client:::defaultNode
dxos/react-toolkit:::defaultNode
dxos/registry-client:::defaultNode
dxos/rpc:::defaultNode
dxos/rpc-tunnel:::defaultNode
dxos/testutils:::defaultNode
dxos/text-model:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../sdk/client-services/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/devtools`](../../devtools/docs/README.md) | &check; |
| [`@dxos/devtools-mesh`](../../devtools-mesh/docs/README.md) |  |
| [`@dxos/echo-db`](../../../echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keyring`](../../../halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) |  |
| [`@dxos/messenger-model`](../../../echo/messenger-model/docs/README.md) |  |
| [`@dxos/model-factory`](../../../echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/object-model`](../../../echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) |  |
| [`@dxos/react-client`](../../../sdk/react-client/docs/README.md) |  |
| [`@dxos/react-components`](../../../sdk/react-components/docs/README.md) |  |
| [`@dxos/react-registry-client`](../../../sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) |  |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../common/testutils/docs/README.md) |  |
| [`@dxos/text-model`](../../../echo/text-model/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

# @dxos/kai

Kai Web shell.

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
dxos/client-testing --> dxos/client;
dxos/config --> dxos/protocols;
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/echo-db --> dxos/halo-protocol;
dxos/echo-db --> dxos/network-manager;
dxos/echo-db --> dxos/object-model;
dxos/echo-db --> dxos/protocol-plugin-replicator;
dxos/echo-db --> dxos/protocol-plugin-rpc;
dxos/feed-store --> dxos/keyring;
dxos/halo-protocol --> dxos/keyring;
dxos/kai --> dxos/client-testing;
dxos/kai --> dxos/react-client;
dxos/keyring --> dxos/protocols;
dxos/keyring --> dxos/random-access-storage;
dxos/mesh-protocol --> dxos/codec-protobuf;
dxos/messaging --> dxos/rpc;
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
dxos/rpc --> dxos/protocols;
dxos/rpc-tunnel --> dxos/rpc;

%% Sections
subgraph experimental
  style experimental fill:#b8e6b3,stroke:#fff;

  dxos/kai("@dxos/kai")
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
  dxos/client-testing("@dxos/client-testing")
  dxos/config("@dxos/config")
  dxos/react-client("@dxos/react-client")
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
  dxos/model-factory("@dxos/model-factory")
  dxos/object-model("@dxos/object-model")
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
click dxos/client-testing "dxos/dxos/tree/main/packages/sdk/client-testing/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/credentials "dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/echo-db "dxos/dxos/tree/main/packages/echo/echo-db/docs";
click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs";
click dxos/halo-protocol "dxos/dxos/tree/main/packages/halo/halo-protocol/docs";
click dxos/keyring "dxos/dxos/tree/main/packages/halo/keyring/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/messaging "dxos/dxos/tree/main/packages/mesh/messaging/docs";
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
click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/common/rpc-tunnel/docs";
click dxos/testutils "dxos/dxos/tree/main/packages/common/testutils/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/kai:::rootNode

dxos/async:::defaultNode
dxos/bot-factory-client:::defaultNode
dxos/broadcast:::defaultNode
dxos/client:::defaultNode
dxos/client-services:::defaultNode
dxos/client-testing:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/credentials:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/echo-db:::defaultNode
dxos/feed-store:::defaultNode
dxos/halo-protocol:::defaultNode
dxos/keyring:::defaultNode
dxos/keys:::defaultNode
dxos/log:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/messaging:::defaultNode
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
dxos/rpc:::defaultNode
dxos/rpc-tunnel:::defaultNode
dxos/testutils:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../packages/common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../../packages/bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/broadcast`](../../../../packages/mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../../packages/sdk/client-services/docs/README.md) |  |
| [`@dxos/client-testing`](../../../../packages/sdk/client-testing/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../../packages/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../../packages/common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../../packages/common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../../packages/echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../../packages/common/feed-store/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../../packages/halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keyring`](../../../../packages/halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../../packages/common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../../packages/common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../../packages/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../../packages/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../../packages/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../../packages/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../../packages/echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../../packages/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../../packages/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../../packages/mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../../packages/common/protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../../../packages/common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../../packages/common/react-async/docs/README.md) | &check; |
| [`@dxos/react-client`](../../../../packages/sdk/react-client/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../../packages/common/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../../packages/common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../../packages/common/testutils/docs/README.md) |  |
| [`@dxos/util`](../../../../packages/common/util/docs/README.md) |  |

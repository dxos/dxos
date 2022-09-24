# @dxos/kai

Kai Web shell.

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
dxos/kai --> dxos/client-testing;
dxos/kai --> dxos/react-client;
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
dxos/rpc-tunnel --> dxos/rpc;
dxos/util --> dxos/protocols;

%% Sections
subgraph experimental
  style experimental fill:#b8e6b3,stroke:#fff;

  dxos/kai("@dxos/kai")
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

subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/client("@dxos/client")
  dxos/client-testing("@dxos/client-testing")
  dxos/config("@dxos/config")
  dxos/react-client("@dxos/react-client")
end

subgraph echo
  style echo fill:#b3cae6,stroke:#fff;

  dxos/echo-db("@dxos/echo-db")
  dxos/echo-protocol("@dxos/echo-protocol")
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
click dxos/debug href "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/echo-db href "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-db/docs";
click dxos/messaging href "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/model-factory href "https:/github.com/dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/protocols href "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/react-async href "https:/github.com/dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/react-client href "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-client/docs";
click dxos/rpc href "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/rpc-tunnel href "https:/github.com/dxos/dxos/tree/main/packages/common/rpc-tunnel/docs";
click dxos/util href "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/kai:::rootNode

dxos/async:::defaultNode
dxos/bot-factory-client:::defaultNode
dxos/client:::defaultNode
dxos/client-testing:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/debug:::defaultNode
dxos/echo-db:::defaultNode
dxos/messaging:::defaultNode
dxos/model-factory:::defaultNode
dxos/protocols:::defaultNode
dxos/react-async:::defaultNode
dxos/react-client:::defaultNode
dxos/rpc:::defaultNode
dxos/rpc-tunnel:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../packages/common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../../packages/bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/client`](../../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/client-testing`](../../../../packages/sdk/client-testing/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/debug`](../../../../packages/common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../../packages/echo/echo-db/docs/README.md) |  |
| [`@dxos/messaging`](../../../../packages/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../../packages/echo/model-factory/docs/README.md) |  |
| [`@dxos/protocols`](../../../../packages/common/protocols/docs/README.md) |  |
| [`@dxos/react-async`](../../../../packages/common/react-async/docs/README.md) | &check; |
| [`@dxos/react-client`](../../../../packages/sdk/react-client/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../../packages/common/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../../packages/common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/util`](../../../../packages/common/util/docs/README.md) |  |

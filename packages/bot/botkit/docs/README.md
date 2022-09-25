# @dxos/botkit

Bot

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/bot-factory-client --> dxos/protocol-plugin-rpc;
dxos/botkit --> dxos/bot-factory-client;
dxos/botkit --> dxos/network-manager;
dxos/botkit --> dxos/registry-client;
dxos/broadcast --> dxos/crypto;
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/crypto --> dxos/protocols;
dxos/messaging --> dxos/rpc;
dxos/network-manager --> dxos/credentials;
dxos/network-manager --> dxos/messaging;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/protocol-plugin-rpc --> dxos/mesh-protocol;
dxos/protocol-plugin-rpc --> dxos/messaging;
dxos/protocols --> dxos/codec-protobuf;
dxos/registry-client --> dxos/config;
dxos/util --> dxos/protocols;

%% Sections
subgraph bot
  style bot fill:#c2b3e6,stroke:#fff;

  dxos/bot-factory-client("@dxos/bot-factory-client")
  dxos/botkit("@dxos/botkit")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/protocols("@dxos/protocols")
  dxos/rpc("@dxos/rpc")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/log("@dxos/log")
    dxos/util("@dxos/util")
  end
end

subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/broadcast("@dxos/broadcast")
  dxos/mesh-protocol("@dxos/mesh-protocol")
  dxos/messaging("@dxos/messaging")
  dxos/network-manager("@dxos/network-manager")
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence")
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc")
end

subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/config("@dxos/config")
  dxos/registry-client("@dxos/registry-client")
end

subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/credentials("@dxos/credentials")
end

subgraph echo
  style echo fill:#b3cae6,stroke:#fff;

  dxos/feed-store("@dxos/feed-store")
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/bot-factory-client "dxos/dxos/tree/main/packages/bot/bot-factory-client/docs";
click dxos/broadcast "dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/credentials "dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/feed-store "dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/messaging "dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/network-manager "dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocol-plugin-rpc "dxos/dxos/tree/main/packages/mesh/protocol-plugin-rpc/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/registry-client "dxos/dxos/tree/main/packages/sdk/registry-client/docs";
click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/botkit:::rootNode

dxos/async:::defaultNode
dxos/bot-factory-client:::defaultNode
dxos/broadcast:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/credentials:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/feed-store:::defaultNode
dxos/log:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/messaging:::defaultNode
dxos/network-manager:::defaultNode
dxos/protocol-plugin-presence:::defaultNode
dxos/protocol-plugin-rpc:::defaultNode
dxos/protocols:::defaultNode
dxos/registry-client:::defaultNode
dxos/rpc:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/bot-factory-client`](../../bot-factory-client/docs/README.md) | &check; |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../echo/feed-store/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) | &check; |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

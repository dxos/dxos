# @dxos/devtools-mesh



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/broadcast --> dxos/crypto;
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/crypto --> dxos/protocols;
dxos/devtools-mesh --> dxos/gem-spore;
dxos/devtools-mesh --> dxos/network-manager;
dxos/devtools-mesh --> dxos/react-components;
dxos/devtools-mesh --> dxos/react-toolkit;
dxos/gem-spore --> dxos/gem-core;
dxos/messaging --> dxos/rpc;
dxos/network-manager --> dxos/credentials;
dxos/network-manager --> dxos/messaging;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/protocols --> dxos/codec-protobuf;
dxos/react-components --> dxos/react-async;
dxos/react-registry-client --> dxos/registry-client;
dxos/react-toolkit --> dxos/react-async;
dxos/react-toolkit --> dxos/react-registry-client;
dxos/registry-client --> dxos/config;
dxos/util --> dxos/protocols;

%% Sections
subgraph devtools
  style devtools fill:#badade,stroke:#fff;

  dxos/devtools-mesh("@dxos/devtools-mesh")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/protocols("@dxos/protocols")
  dxos/react-async("@dxos/react-async")
  dxos/rpc("@dxos/rpc")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/log("@dxos/log")
    dxos/util("@dxos/util")
  end
end

subgraph gem
  style gem fill:#b3c7e6,stroke:#fff;

  dxos/gem-core("@dxos/gem-core")
  dxos/gem-spore("@dxos/gem-spore")
end

subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/broadcast("@dxos/broadcast")
  dxos/mesh-protocol("@dxos/mesh-protocol")
  dxos/messaging("@dxos/messaging")
  dxos/network-manager("@dxos/network-manager")
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence")
end

subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/credentials("@dxos/credentials")
end

subgraph echo
  style echo fill:#b3cae6,stroke:#fff;

  dxos/feed-store("@dxos/feed-store")
end

subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/config("@dxos/config")
  dxos/react-components("@dxos/react-components")
  dxos/react-registry-client("@dxos/react-registry-client")
  dxos/react-toolkit("@dxos/react-toolkit")
  dxos/registry-client("@dxos/registry-client")
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/broadcast "dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/credentials "dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/feed-store "dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs";
click dxos/gem-spore "dxos/dxos/tree/main/packages/gem/gem-spore/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/messaging "dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/network-manager "dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/react-components "dxos/dxos/tree/main/packages/sdk/react-components/docs";
click dxos/react-registry-client "dxos/dxos/tree/main/packages/sdk/react-registry-client/docs";
click dxos/react-toolkit "dxos/dxos/tree/main/packages/sdk/react-toolkit/docs";
click dxos/registry-client "dxos/dxos/tree/main/packages/sdk/registry-client/docs";
click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/devtools-mesh:::rootNode

dxos/async:::defaultNode
dxos/broadcast:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/credentials:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/feed-store:::defaultNode
dxos/gem-core:::defaultNode
dxos/gem-spore:::defaultNode
dxos/log:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/messaging:::defaultNode
dxos/network-manager:::defaultNode
dxos/protocol-plugin-presence:::defaultNode
dxos/protocols:::defaultNode
dxos/react-async:::defaultNode
dxos/react-components:::defaultNode
dxos/react-registry-client:::defaultNode
dxos/react-toolkit:::defaultNode
dxos/registry-client:::defaultNode
dxos/rpc:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../sdk/config/docs/README.md) |  |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../echo/feed-store/docs/README.md) |  |
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../../gem/gem-spore/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) | &check; |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) |  |
| [`@dxos/react-components`](../../../sdk/react-components/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../../sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) |  |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

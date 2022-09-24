# @dxos/devtools-mesh



## Dependency Graph

```mermaid
flowchart LR;

style dxos/devtools-mesh fill:#fff,stroke-width:4px;

click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/gem-core "https:/github.com/dxos/dxos/tree/main/packages/gem/gem-core/docs";
click dxos/gem-spore "https:/github.com/dxos/dxos/tree/main/packages/gem/gem-spore/docs";
click dxos/network-manager "https:/github.com/dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/credentials "https:/github.com/dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/log "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/messaging "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/protocol-plugin-presence "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/rpc "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/broadcast "https:/github.com/dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/react-components "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-components/docs";
click dxos/react-async "https:/github.com/dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/react-toolkit "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-toolkit/docs";
click dxos/react-registry-client "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-registry-client/docs";

subgraph devtools
  style devtools fill:#d6f2f5,stroke:#fff;
  dxos/devtools-mesh("@dxos/devtools-mesh");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/debug("@dxos/debug");
  dxos/async("@dxos/async");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/crypto("@dxos/crypto");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
  dxos/log("@dxos/log");
  dxos/rpc("@dxos/rpc");
  dxos/react-async("@dxos/react-async");
end

subgraph gem
  style gem fill:#d6e2f5,stroke:#fff;
  dxos/gem-core("@dxos/gem-core");
  dxos/gem-spore("@dxos/gem-spore");
end

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/network-manager("@dxos/network-manager");
  dxos/mesh-protocol("@dxos/mesh-protocol");
  dxos/messaging("@dxos/messaging");
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence");
  dxos/broadcast("@dxos/broadcast");
end

subgraph halo
  style halo fill:#e3d6f5,stroke:#fff;
  dxos/credentials("@dxos/credentials");
end

subgraph echo
  style echo fill:#d6e4f5,stroke:#fff;
  dxos/feed-store("@dxos/feed-store");
end

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/react-components("@dxos/react-components");
  dxos/react-toolkit("@dxos/react-toolkit");
  dxos/react-registry-client("@dxos/react-registry-client");
  dxos/config("@dxos/config");
  dxos/registry-client("@dxos/registry-client");
end

dxos/devtools-mesh --> dxos/gem-spore;
dxos/gem-spore --> dxos/gem-core;
dxos/devtools-mesh --> dxos/network-manager;
dxos/async --> dxos/debug;
dxos/network-manager --> dxos/credentials;
dxos/credentials --> dxos/crypto;
dxos/crypto --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
dxos/credentials --> dxos/feed-store;
dxos/feed-store --> dxos/async;
dxos/feed-store --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/credentials --> dxos/mesh-protocol;
dxos/mesh-protocol --> dxos/async;
dxos/mesh-protocol --> dxos/util;
dxos/network-manager --> dxos/messaging;
dxos/messaging --> dxos/log;
dxos/messaging --> dxos/rpc;
dxos/rpc --> dxos/async;
dxos/rpc --> dxos/util;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/broadcast --> dxos/async;
dxos/broadcast --> dxos/crypto;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/devtools-mesh --> dxos/react-components;
dxos/react-components --> dxos/async;
dxos/react-components --> dxos/react-async;
dxos/react-components --> dxos/util;
dxos/devtools-mesh --> dxos/react-toolkit;
dxos/react-toolkit --> dxos/react-async;
dxos/react-toolkit --> dxos/react-registry-client;
dxos/config --> dxos/util;
dxos/react-registry-client --> dxos/registry-client;
dxos/registry-client --> dxos/config;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
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
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

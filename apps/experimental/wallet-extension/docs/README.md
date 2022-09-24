# @dxos/wallet-extension

DXOS Wallet Extension

## Dependency Graph

```mermaid
flowchart LR;

style dxos/wallet-extension fill:#fff,stroke-width:4px;

click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/client "https:/github.com/dxos/dxos/tree/main/packages/sdk/client/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "https:/github.com/dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/echo-db "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-db/docs";
click dxos/model-factory "https:/github.com/dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/rpc "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/rpc-tunnel "https:/github.com/dxos/dxos/tree/main/packages/common/rpc-tunnel/docs";
click dxos/messaging "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/log "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";
click dxos/credentials "https:/github.com/dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/echo-protocol "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-protocol/docs";
click dxos/feed-store "https:/github.com/dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/network-manager "https:/github.com/dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/object-model "https:/github.com/dxos/dxos/tree/main/packages/echo/object-model/docs";
click dxos/protocol-plugin-presence "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocol-plugin-replicator "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs";
click dxos/random-access-storage "https:/github.com/dxos/dxos/tree/main/packages/common/random-access-storage/docs";
click dxos/react-client "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-client/docs";
click dxos/bot-factory-client "https:/github.com/dxos/dxos/tree/main/packages/bot/bot-factory-client/docs";
click dxos/react-async "https:/github.com/dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/react-components "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-components/docs";
click dxos/react-toolkit "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-toolkit/docs";
click dxos/react-registry-client "https:/github.com/dxos/dxos/tree/main/packages/sdk/react-registry-client/docs";

subgraph experimental
  style experimental fill:#d9f5d6,stroke:#fff;
  dxos/wallet-extension("@dxos/wallet-extension");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
  dxos/log("@dxos/log");
  dxos/crypto("@dxos/crypto");
  dxos/rpc("@dxos/rpc");
  dxos/random-access-storage("@dxos/random-access-storage");
  dxos/rpc-tunnel("@dxos/rpc-tunnel");
  dxos/react-async("@dxos/react-async");
end

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/client("@dxos/client");
  dxos/config("@dxos/config");
  dxos/react-client("@dxos/react-client");
  dxos/react-components("@dxos/react-components");
  dxos/react-toolkit("@dxos/react-toolkit");
  dxos/react-registry-client("@dxos/react-registry-client");
  dxos/registry-client("@dxos/registry-client");
end

subgraph echo
  style echo fill:#d6e4f5,stroke:#fff;
  dxos/echo-db("@dxos/echo-db");
  dxos/feed-store("@dxos/feed-store");
  dxos/echo-protocol("@dxos/echo-protocol");
  dxos/model-factory("@dxos/model-factory");
  dxos/object-model("@dxos/object-model");
end

subgraph halo
  style halo fill:#e3d6f5,stroke:#fff;
  dxos/credentials("@dxos/credentials");
end

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/mesh-protocol("@dxos/mesh-protocol");
  dxos/messaging("@dxos/messaging");
  dxos/network-manager("@dxos/network-manager");
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence");
  dxos/broadcast("@dxos/broadcast");
  dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator");
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc");
end

subgraph bot
  style bot fill:#dfd6f5,stroke:#fff;
  dxos/bot-factory-client("@dxos/bot-factory-client");
end

dxos/async --> dxos/debug;
dxos/client --> dxos/config;
dxos/protocols --> dxos/codec-protobuf;
dxos/config --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/client --> dxos/echo-db;
dxos/credentials --> dxos/crypto;
dxos/crypto --> dxos/protocols;
dxos/credentials --> dxos/feed-store;
dxos/feed-store --> dxos/async;
dxos/feed-store --> dxos/util;
dxos/credentials --> dxos/mesh-protocol;
dxos/mesh-protocol --> dxos/async;
dxos/mesh-protocol --> dxos/util;
dxos/echo-protocol --> dxos/credentials;
dxos/messaging --> dxos/log;
dxos/messaging --> dxos/rpc;
dxos/rpc --> dxos/async;
dxos/rpc --> dxos/util;
dxos/model-factory --> dxos/async;
dxos/model-factory --> dxos/util;
dxos/echo-db --> dxos/network-manager;
dxos/network-manager --> dxos/credentials;
dxos/network-manager --> dxos/messaging;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/broadcast --> dxos/async;
dxos/broadcast --> dxos/crypto;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/echo-db --> dxos/object-model;
dxos/object-model --> dxos/echo-protocol;
dxos/object-model --> dxos/model-factory;
dxos/echo-db --> dxos/protocol-plugin-replicator;
dxos/protocol-plugin-replicator --> dxos/mesh-protocol;
dxos/echo-db --> dxos/random-access-storage;
dxos/random-access-storage --> dxos/log;
dxos/client --> dxos/rpc-tunnel;
dxos/rpc-tunnel --> dxos/rpc;
dxos/wallet-extension --> dxos/react-client;
dxos/react-client --> dxos/bot-factory-client;
dxos/bot-factory-client --> dxos/protocol-plugin-rpc;
dxos/protocol-plugin-rpc --> dxos/messaging;
dxos/protocol-plugin-rpc --> dxos/mesh-protocol;
dxos/react-client --> dxos/client;
dxos/react-client --> dxos/react-async;
dxos/wallet-extension --> dxos/react-components;
dxos/react-components --> dxos/async;
dxos/react-components --> dxos/react-async;
dxos/react-components --> dxos/util;
dxos/wallet-extension --> dxos/react-toolkit;
dxos/react-toolkit --> dxos/react-async;
dxos/react-toolkit --> dxos/react-registry-client;
dxos/react-registry-client --> dxos/registry-client;
dxos/registry-client --> dxos/config;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../packages/common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../../packages/bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/client`](../../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../packages/common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../../packages/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../../packages/common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../../packages/common/debug/docs/README.md) |  |
| [`@dxos/echo-db`](../../../../packages/echo/echo-db/docs/README.md) | &check; |
| [`@dxos/echo-protocol`](../../../../packages/echo/echo-protocol/docs/README.md) |  |
| [`@dxos/feed-store`](../../../../packages/echo/feed-store/docs/README.md) |  |
| [`@dxos/log`](../../../../packages/common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../../packages/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../../packages/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../../packages/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../../packages/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../../packages/echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../../packages/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../../packages/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocols`](../../../../packages/common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../../packages/common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../../packages/common/react-async/docs/README.md) |  |
| [`@dxos/react-client`](../../../../packages/sdk/react-client/docs/README.md) | &check; |
| [`@dxos/react-components`](../../../../packages/sdk/react-components/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../../../packages/sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../../packages/sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../../packages/common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../../packages/common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/util`](../../../../packages/common/util/docs/README.md) | &check; |

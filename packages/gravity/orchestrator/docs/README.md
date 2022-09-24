# @dxos/gravity-orchestrator



## Dependency Graph

```mermaid
flowchart LR;

style dxos/gravity-orchestrator fill:#fff,stroke-width:4px;

click dxos/bot-factory-client "https:/github.com/dxos/dxos/tree/main/packages/bot/bot-factory-client/docs";
click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/protocol-plugin-rpc "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-rpc/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/rpc "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/botkit "https:/github.com/dxos/dxos/tree/main/packages/bot/botkit/docs";
click dxos/config "https:/github.com/dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/crypto "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/network-manager "https:/github.com/dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/registry-client "https:/github.com/dxos/dxos/tree/main/packages/sdk/registry-client/docs";
click dxos/messaging "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/client "https:/github.com/dxos/dxos/tree/main/packages/sdk/client/docs";
click dxos/echo-db "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-db/docs";
click dxos/model-factory "https:/github.com/dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/rpc-tunnel "https:/github.com/dxos/dxos/tree/main/packages/common/rpc-tunnel/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/log "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";
click dxos/credentials "https:/github.com/dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/echo-protocol "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-protocol/docs";
click dxos/feed-store "https:/github.com/dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/object-model "https:/github.com/dxos/dxos/tree/main/packages/echo/object-model/docs";
click dxos/protocol-plugin-presence "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/protocol-plugin-replicator "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs";
click dxos/random-access-storage "https:/github.com/dxos/dxos/tree/main/packages/common/random-access-storage/docs";
click dxos/signal "https:/github.com/dxos/dxos/tree/main/packages/mesh/signal/docs";
click dxos/testutils "https:/github.com/dxos/dxos/tree/main/packages/common/testutils/docs";

subgraph gravity
  style gravity fill:#f5d6d7,stroke:#fff;
  dxos/gravity-orchestrator("@dxos/gravity-orchestrator");
end

subgraph bot
  style bot fill:#dfd6f5,stroke:#fff;
  dxos/bot-factory-client("@dxos/bot-factory-client");
  dxos/botkit("@dxos/botkit");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/log("@dxos/log");
  dxos/protocols("@dxos/protocols");
  dxos/rpc("@dxos/rpc");
  dxos/util("@dxos/util");
  dxos/crypto("@dxos/crypto");
  dxos/random-access-storage("@dxos/random-access-storage");
  dxos/rpc-tunnel("@dxos/rpc-tunnel");
  dxos/testutils("@dxos/testutils");
end

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc");
  dxos/messaging("@dxos/messaging");
  dxos/mesh-protocol("@dxos/mesh-protocol");
  dxos/network-manager("@dxos/network-manager");
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence");
  dxos/broadcast("@dxos/broadcast");
  dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator");
  dxos/signal("@dxos/signal");
end

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/config("@dxos/config");
  dxos/registry-client("@dxos/registry-client");
  dxos/client("@dxos/client");
end

subgraph halo
  style halo fill:#e3d6f5,stroke:#fff;
  dxos/credentials("@dxos/credentials");
end

subgraph echo
  style echo fill:#d6e4f5,stroke:#fff;
  dxos/feed-store("@dxos/feed-store");
  dxos/echo-db("@dxos/echo-db");
  dxos/echo-protocol("@dxos/echo-protocol");
  dxos/model-factory("@dxos/model-factory");
  dxos/object-model("@dxos/object-model");
end

dxos/async --> dxos/debug;
dxos/bot-factory-client --> dxos/protocol-plugin-rpc;
dxos/protocol-plugin-rpc --> dxos/messaging;
dxos/messaging --> dxos/log;
dxos/protocols --> dxos/codec-protobuf;
dxos/messaging --> dxos/rpc;
dxos/rpc --> dxos/async;
dxos/rpc --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/protocol-plugin-rpc --> dxos/mesh-protocol;
dxos/mesh-protocol --> dxos/async;
dxos/mesh-protocol --> dxos/util;
dxos/gravity-orchestrator --> dxos/botkit;
dxos/botkit --> dxos/bot-factory-client;
dxos/config --> dxos/util;
dxos/crypto --> dxos/protocols;
dxos/botkit --> dxos/network-manager;
dxos/network-manager --> dxos/credentials;
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/feed-store --> dxos/async;
dxos/feed-store --> dxos/util;
dxos/credentials --> dxos/mesh-protocol;
dxos/network-manager --> dxos/messaging;
dxos/network-manager --> dxos/protocol-plugin-presence;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/broadcast --> dxos/async;
dxos/broadcast --> dxos/crypto;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/botkit --> dxos/registry-client;
dxos/registry-client --> dxos/config;
dxos/gravity-orchestrator --> dxos/client;
dxos/client --> dxos/config;
dxos/client --> dxos/echo-db;
dxos/echo-protocol --> dxos/credentials;
dxos/model-factory --> dxos/async;
dxos/model-factory --> dxos/util;
dxos/echo-db --> dxos/network-manager;
dxos/echo-db --> dxos/object-model;
dxos/object-model --> dxos/echo-protocol;
dxos/object-model --> dxos/model-factory;
dxos/echo-db --> dxos/protocol-plugin-replicator;
dxos/protocol-plugin-replicator --> dxos/mesh-protocol;
dxos/echo-db --> dxos/random-access-storage;
dxos/random-access-storage --> dxos/log;
dxos/client --> dxos/rpc-tunnel;
dxos/rpc-tunnel --> dxos/rpc;
dxos/gravity-orchestrator --> dxos/signal;
dxos/signal --> dxos/async;
dxos/gravity-orchestrator --> dxos/testutils;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/bot-factory-client`](../../../bot/bot-factory-client/docs/README.md) | &check; |
| [`@dxos/botkit`](../../../bot/botkit/docs/README.md) | &check; |
| [`@dxos/client`](../../../sdk/client/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../echo/echo-db/docs/README.md) | &check; |
| [`@dxos/echo-protocol`](../../../echo/echo-protocol/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../echo/feed-store/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) | &check; |
| [`@dxos/model-factory`](../../../echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/object-model`](../../../echo/object-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/signal`](../../../mesh/signal/docs/README.md) | &check; |
| [`@dxos/testutils`](../../../common/testutils/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

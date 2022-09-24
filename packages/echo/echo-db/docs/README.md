# @dxos/echo-db

ECHO database.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/echo-db fill:#fff,stroke-width:4px;

click dxos/log "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";
click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/credentials "https:/github.com/dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/feed-store "https:/github.com/dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/echo-protocol "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-protocol/docs";
click dxos/messaging "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/rpc "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/model-factory "https:/github.com/dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/network-manager "https:/github.com/dxos/dxos/tree/main/packages/mesh/network-manager/docs";
click dxos/protocol-plugin-presence "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-presence/docs";
click dxos/object-model "https:/github.com/dxos/dxos/tree/main/packages/echo/object-model/docs";
click dxos/broadcast "https:/github.com/dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/protocol-plugin-replicator "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs";
click dxos/random-access-storage "https:/github.com/dxos/dxos/tree/main/packages/common/random-access-storage/docs";

subgraph echo
  style echo fill:#d6e4f5,stroke:#fff;
  dxos/echo-db("@dxos/echo-db");
  dxos/feed-store("@dxos/feed-store");
  dxos/echo-protocol("@dxos/echo-protocol");
  dxos/model-factory("@dxos/model-factory");
  dxos/object-model("@dxos/object-model");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/log("@dxos/log");
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/crypto("@dxos/crypto");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
  dxos/rpc("@dxos/rpc");
  dxos/random-access-storage("@dxos/random-access-storage");
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
end

dxos/async --> dxos/debug;
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
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/echo-protocol`](../../echo-protocol/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../feed-store/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) | &check; |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) | &check; |
| [`@dxos/model-factory`](../../model-factory/docs/README.md) | &check; |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/object-model`](../../object-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-replicator`](../../../mesh/protocol-plugin-replicator/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

# @dxos/botkit

Bot
## Dependency Graph
```mermaid
flowchart LR;

subgraph bot
  style bot fill:#dfd6f5,stroke:#fff;
  dxos/botkit("@dxos/botkit");
  dxos/bot-factory-client("@dxos/bot-factory-client");
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
end

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc");
  dxos/messaging("@dxos/messaging");
  dxos/mesh-protocol("@dxos/mesh-protocol");
  dxos/network-manager("@dxos/network-manager");
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence");
  dxos/broadcast("@dxos/broadcast");
end

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/config("@dxos/config");
  dxos/registry-client("@dxos/registry-client");
end

subgraph halo
  style halo fill:#e3d6f5,stroke:#fff;
  dxos/credentials("@dxos/credentials");
end

subgraph echo
  style echo fill:#d6e4f5,stroke:#fff;
  dxos/feed-store("@dxos/feed-store");
end

dxos/botkit --> dxos/bot-factory-client;
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
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/bot-factory-client`](../../bot-factory-client/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
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

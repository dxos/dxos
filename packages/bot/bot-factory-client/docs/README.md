# @dxos/bot-factory-client

Bot

## Dependency Graph

```mermaid
flowchart LR;

style dxos/bot-factory-client fill:#fff,stroke-width:4px;

click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/protocol-plugin-rpc "https:/github.com/dxos/dxos/tree/main/packages/mesh/protocol-plugin-rpc/docs";
click dxos/messaging "https:/github.com/dxos/dxos/tree/main/packages/mesh/messaging/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/rpc "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";

subgraph bot
  style bot fill:#dfd6f5,stroke:#fff;
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
end

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc");
  dxos/messaging("@dxos/messaging");
  dxos/mesh-protocol("@dxos/mesh-protocol");
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
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

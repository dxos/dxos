# @dxos/protocol-plugin-presence

Protocol plugin presence.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/protocol-plugin-presence fill:#fff,stroke-width:4px;

click dxos/broadcast "https:/github.com/dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/crypto "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence");
  dxos/broadcast("@dxos/broadcast");
  dxos/mesh-protocol("@dxos/mesh-protocol");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/crypto("@dxos/crypto");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
end

dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/broadcast --> dxos/async;
dxos/async --> dxos/debug;
dxos/broadcast --> dxos/crypto;
dxos/crypto --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/mesh-protocol --> dxos/async;
dxos/mesh-protocol --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../broadcast/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

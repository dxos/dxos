# @dxos/protocol-plugin-replicator

Protocol plugin replicator.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/protocol-plugin-replicator fill:#fff,stroke-width:4px;

click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/mesh-protocol "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator");
  dxos/mesh-protocol("@dxos/mesh-protocol");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/util("@dxos/util");
  dxos/protocols("@dxos/protocols");
end

dxos/async --> dxos/debug;
dxos/protocol-plugin-replicator --> dxos/mesh-protocol;
dxos/mesh-protocol --> dxos/async;
dxos/mesh-protocol --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

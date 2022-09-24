# @dxos/messaging

Messaging

## Dependency Graph

```mermaid
flowchart LR;

style dxos/messaging fill:#fff,stroke-width:4px;

click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/log "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/rpc "https:/github.com/dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/messaging("@dxos/messaging");
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

dxos/async --> dxos/debug;
dxos/messaging --> dxos/log;
dxos/protocols --> dxos/codec-protobuf;
dxos/messaging --> dxos/rpc;
dxos/rpc --> dxos/async;
dxos/rpc --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

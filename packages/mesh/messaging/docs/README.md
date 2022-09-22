# @dxos/messaging

Messaging
## Dependency Graph
```mermaid
flowchart LR;

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

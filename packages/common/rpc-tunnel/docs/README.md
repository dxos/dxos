# @dxos/rpc-tunnel

RPC ports over various transports.
## Dependency Graph
```mermaid
flowchart LR;

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/rpc-tunnel("@dxos/rpc-tunnel");
  dxos/rpc("@dxos/rpc");
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
end

dxos/rpc-tunnel --> dxos/rpc;
dxos/rpc --> dxos/async;
dxos/async --> dxos/debug;
dxos/protocols --> dxos/codec-protobuf;
dxos/rpc --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/async`](../../async/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/debug`](../../debug/docs/README.md) |  |
| [`@dxos/protocols`](../../protocols/docs/README.md) |  |
| [`@dxos/rpc`](../../rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../util/docs/README.md) |  |

# @dxos/rpc

Tiny RPC library.
## Dependency Graph
```mermaid
flowchart LR;

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/rpc("@dxos/rpc");
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
end

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
| [`@dxos/async`](../../async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../util/docs/README.md) | &check; |

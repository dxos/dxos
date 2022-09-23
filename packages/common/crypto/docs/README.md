# @dxos/crypto

Basic crypto key utils
## Dependency Graph
```mermaid
flowchart LR;

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/crypto("@dxos/crypto");
  dxos/protocols("@dxos/protocols");
  dxos/codec-protobuf("@dxos/codec-protobuf");
end

dxos/crypto --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/protocols`](../../protocols/docs/README.md) | &check; |

# @dxos/protocols

Protobuf definitions for DXOS protocols.
## Dependency Graph
```mermaid
flowchart LR;

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/protocols("@dxos/protocols");
  dxos/codec-protobuf("@dxos/codec-protobuf");
end

dxos/protocols --> dxos/codec-protobuf;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) | &check; |

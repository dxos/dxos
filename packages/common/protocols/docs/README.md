# @dxos/protocols

Protobuf definitions for DXOS protocols.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/protocols fill:#fff,stroke-width:4px;

click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";

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

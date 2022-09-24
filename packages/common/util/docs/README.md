# @dxos/util

Temporary bucket for misc functions, which should graduate into separate packages.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/util fill:#fff,stroke-width:4px;

click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/util("@dxos/util");
  dxos/debug("@dxos/debug");
  dxos/protocols("@dxos/protocols");
  dxos/codec-protobuf("@dxos/codec-protobuf");
end

dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/debug`](../../debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../protocols/docs/README.md) | &check; |

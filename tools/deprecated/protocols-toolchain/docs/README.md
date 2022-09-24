# @dxos/protocols-toolchain



## Dependency Graph

```mermaid
flowchart LR;

style dxos/protocols-toolchain fill:#fff,stroke-width:4px;

click dxos/toolchain-node-library "https:/github.com/dxos/dxos/tree/main/tools/deprecated/toolchain-node-library/docs";
click dxos/protobuf-compiler "https:/github.com/dxos/dxos/tree/main/tools/executors/protobuf-compiler/docs";

subgraph deprecated
  style deprecated fill:#d6dff5,stroke:#fff;
  dxos/protocols-toolchain("@dxos/protocols-toolchain");
  dxos/toolchain-node-library("@dxos/toolchain-node-library");
end

subgraph executors
  style executors fill:#f5d6d9,stroke:#fff;
  dxos/protobuf-compiler("@dxos/protobuf-compiler");
end

dxos/protocols-toolchain --> dxos/toolchain-node-library;
dxos/toolchain-node-library --> dxos/protobuf-compiler;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/protobuf-compiler`](../../../executors/protobuf-compiler/docs/README.md) |  |
| [`@dxos/toolchain-node-library`](../../toolchain-node-library/docs/README.md) | &check; |

# @dxos/protocols-toolchain



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph deprecated [deprecated]
  style deprecated fill:#bac5de,stroke:#fff
  dxos/protocols-toolchain("@dxos/protocols-toolchain"):::root
  click dxos/protocols-toolchain "dxos/dxos/tree/main/tools/deprecated/protocols-toolchain/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocols-toolchain --> dxos/toolchain-node-library
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/protobuf-compiler`](../../../executors/protobuf-compiler/docs/README.md) |  |
| [`@dxos/toolchain-node-library`](../../toolchain-node-library/docs/README.md) | &check; |

# @dxos/toolchain-node-library



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph deprecated [deprecated]
  style deprecated fill:#ebeffa,stroke:#333
  dxos/toolchain-node-library("@dxos/toolchain-node-library"):::root
  click dxos/toolchain-node-library "dxos/dxos/tree/main/tools/deprecated/toolchain-node-library/docs"
end

subgraph executors [executors]
  style executors fill:#faebec,stroke:#333
  dxos/protobuf-compiler("@dxos/protobuf-compiler"):::def
  click dxos/protobuf-compiler "dxos/dxos/tree/main/tools/executors/protobuf-compiler/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/toolchain-node-library --> dxos/protobuf-compiler
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/protobuf-compiler`](../../../executors/protobuf-compiler/docs/README.md) | &check; |

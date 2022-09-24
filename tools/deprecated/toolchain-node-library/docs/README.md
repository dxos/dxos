# @dxos/toolchain-node-library



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/toolchain-node-library --> dxos/protobuf-compiler;

%% Sections
subgraph deprecated
  style deprecated fill:#bac5de,stroke:#fff;

  dxos/toolchain-node-library("@dxos/toolchain-node-library")
end

subgraph executors
  style executors fill:#edabb0,stroke:#fff;

  dxos/protobuf-compiler("@dxos/protobuf-compiler")
end


%% Hyperlinks
click dxos/protobuf-compiler "dxos/dxos/tree/main/tools/executors/protobuf-compiler/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/toolchain-node-library:::rootNode

dxos/protobuf-compiler:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/protobuf-compiler`](../../../executors/protobuf-compiler/docs/README.md) | &check; |

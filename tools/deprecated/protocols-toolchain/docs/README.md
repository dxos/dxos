# @dxos/protocols-toolchain



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/protocols-toolchain --> dxos/toolchain-node-library;
dxos/toolchain-node-library --> dxos/protobuf-compiler;

%% Sections
subgraph deprecated
  style deprecated fill:#bac5de,stroke:#fff;

  dxos/protocols-toolchain("@dxos/protocols-toolchain")
  dxos/toolchain-node-library("@dxos/toolchain-node-library")
end

subgraph executors
  style executors fill:#edabb0,stroke:#fff;

  dxos/protobuf-compiler("@dxos/protobuf-compiler")
end


%% Hyperlinks
click dxos/protobuf-compiler href "https:/github.com/dxos/dxos/tree/main/tools/executors/protobuf-compiler/docs";
click dxos/toolchain-node-library href "https:/github.com/dxos/dxos/tree/main/tools/deprecated/toolchain-node-library/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/protocols-toolchain:::rootNode

dxos/protobuf-compiler:::defaultNode
dxos/toolchain-node-library:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/protobuf-compiler`](../../../executors/protobuf-compiler/docs/README.md) |  |
| [`@dxos/toolchain-node-library`](../../toolchain-node-library/docs/README.md) | &check; |

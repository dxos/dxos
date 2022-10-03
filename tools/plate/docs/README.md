# @dxos/plate



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph tools [tools]
  style tools fill:#bbabed,stroke:#fff
  dxos/plate("@dxos/plate"):::root
  click dxos/plate "dxos/dxos/tree/main/tools/plate/docs"
  dxos/file("@dxos/file"):::def
  click dxos/file "dxos/dxos/tree/main/tools/file/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/plate --> dxos/file
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/file`](../../file/docs/README.md) | &check; |

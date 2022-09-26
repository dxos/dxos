# @dxos/plate



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph fx [fx]
  style fx fill:#e6b3c3,stroke:#fff
  dxos/plate("@dxos/plate"):::root
  click dxos/plate "dxos/dxos/tree/main/packages/fx/plate/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/plate --> dxos/file
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/file`](../../file/docs/README.md) | &check; |

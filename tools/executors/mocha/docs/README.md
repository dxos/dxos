# @dxos/mocha



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph executors [executors]
  style executors fill:#b1abed,stroke:#333
  dxos/mocha("@dxos/mocha"):::root
  click dxos/mocha "dxos/dxos/tree/main/tools/executors/mocha/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
```

## Dependencies

| Module | Direct |
|---|---|

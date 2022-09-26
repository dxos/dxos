# @dxos/gem-core

Gem core components and utils.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph gem [gem]
  style gem fill:#b3c7e6,stroke:#fff
  dxos/gem-core("@dxos/gem-core"):::root
  click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
```

## Dependencies

| Module | Direct |
|---|---|

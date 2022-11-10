# @dxos/gem-spore

Gem spore.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph gem [gem]
  style gem fill:#ebf1fa,stroke:#333
  dxos/gem-spore("@dxos/gem-spore"):::root
  click dxos/gem-spore "dxos/dxos/tree/main/packages/gem/gem-spore/docs"
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/gem-spore --> dxos/gem-core
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../gem-core/docs/README.md) | &check; |

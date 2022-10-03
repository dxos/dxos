# @dxos/react-echo-graph

Low level components using gem library.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph sdk [sdk]
  style sdk fill:#f9faeb,stroke:#333
  dxos/react-echo-graph("@dxos/react-echo-graph"):::root
  click dxos/react-echo-graph "dxos/dxos/tree/main/packages/sdk/react-echo-graph/docs"
end

subgraph gem [gem]
  style gem fill:#ebf1fa,stroke:#333
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs"
  dxos/gem-spore("@dxos/gem-spore"):::def
  click dxos/gem-spore "dxos/dxos/tree/main/packages/gem/gem-spore/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/react-echo-graph --> dxos/gem-spore
dxos/gem-spore --> dxos/gem-core
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../../gem/gem-spore/docs/README.md) | &check; |

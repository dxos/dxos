# @dxos/react-echo-graph

Low level components using gem library.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/gem-spore --> dxos/gem-core;
dxos/react-echo-graph --> dxos/gem-spore;

%% Sections
subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/react-echo-graph("@dxos/react-echo-graph")
end

subgraph gem
  style gem fill:#b3c7e6,stroke:#fff;

  dxos/gem-core("@dxos/gem-core")
  dxos/gem-spore("@dxos/gem-spore")
end


%% Hyperlinks
click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs";
click dxos/gem-spore "dxos/dxos/tree/main/packages/gem/gem-spore/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/react-echo-graph:::rootNode

dxos/gem-core:::defaultNode
dxos/gem-spore:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../../gem/gem-spore/docs/README.md) | &check; |

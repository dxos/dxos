# @dxos/gem-spore

Gem spore.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/gem-spore --> dxos/gem-core;

%% Sections
subgraph gem
  style gem fill:#b3c7e6,stroke:#fff;

  dxos/gem-core("@dxos/gem-core")
  dxos/gem-spore("@dxos/gem-spore")
end


%% Hyperlinks
click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/gem-spore:::rootNode

dxos/gem-core:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../gem-core/docs/README.md) | &check; |

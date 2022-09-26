# @dxos/gravity-dashboard

Gravity dashboard.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/gravity-dashboard --> dxos/gem-core;

%% Sections
subgraph gravity
  style gravity fill:#edabad,stroke:#fff;

  dxos/gravity-dashboard("@dxos/gravity-dashboard")
end

subgraph gem
  style gem fill:#b3c7e6,stroke:#fff;

  dxos/gem-core("@dxos/gem-core")
end


%% Hyperlinks
click dxos/gem-core "dxos/dxos/tree/main/packages/gem/gem-core/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/gravity-dashboard:::rootNode

dxos/gem-core:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |

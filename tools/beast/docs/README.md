# @dxos/beast

Code analyzer.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links

%% Sections
subgraph tools
  style tools fill:#bbabed,stroke:#fff;

  dxos/beast("@dxos/beast")
end

subgraph common
  style common fill:#debac2,stroke:#fff;


  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/log("@dxos/log")
  end
end


%% Hyperlinks
click dxos/log href "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/beast:::rootNode

dxos/log:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/log`](../../../packages/common/log/docs/README.md) | &check; |

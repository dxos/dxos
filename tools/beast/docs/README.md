# @dxos/beast

Code analyzer.

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
  dxos/beast("@dxos/beast"):::root
  click dxos/beast "dxos/dxos/tree/main/tools/beast/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/log`](../../../packages/common/log/docs/README.md) | &check; |

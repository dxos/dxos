# @dxos/eslint-plugin



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef default fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph tools [tools]
  style tools fill:#bbabed,stroke:#fff
  dxos/eslint-plugin("@dxos/eslint-plugin"):::root
  click dxos/eslint-plugin "dxos/dxos/tree/main/tools/eslint-plugin/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/eslint-plugin --> dxos/eslint-plugin-rules
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/eslint-plugin-rules`](../../eslint-rules/docs/README.md) | &check; |

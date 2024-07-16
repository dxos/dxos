# @dxos/eslint-plugin



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph undefined [undefined]
  style undefined fill:#faf7eb,stroke:#333
  dxos/eslint-plugin("@dxos/eslint-plugin"):::root
  click dxos/eslint-plugin "dxos/dxos/tree/main/tools/eslint-plugin/docs"
  dxos/eslint-plugin-rules("@dxos/eslint-plugin-rules"):::def
  click dxos/eslint-plugin-rules "dxos/dxos/tree/main/tools/eslint-rules/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/eslint-plugin --> dxos/eslint-plugin-rules
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/eslint-plugin-rules`](../../eslint-rules/docs/README.md) | &check; |

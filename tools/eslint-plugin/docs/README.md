# @dxos/eslint-plugin



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/eslint-plugin --> dxos/eslint-plugin-rules;

%% Sections
subgraph tools
  style tools fill:#bbabed,stroke:#fff;

  dxos/eslint-plugin("@dxos/eslint-plugin")
  dxos/eslint-plugin-rules("@dxos/eslint-plugin-rules")
end


%% Hyperlinks
click dxos/eslint-plugin-rules "dxos/dxos/tree/main/tools/eslint-rules/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/eslint-plugin:::rootNode

dxos/eslint-plugin-rules:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/eslint-plugin-rules`](../../eslint-rules/docs/README.md) | &check; |

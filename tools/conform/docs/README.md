# @dxos/conform

A utility for conforming files across packages in a monorepo

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
  dxos/conform("@dxos/conform"):::root
  click dxos/conform "dxos/dxos/tree/main/tools/conform/docs"
end

subgraph devtools [devtools]
  style devtools fill:#ebf8fa,stroke:#333
  dxos/plate("@dxos/plate"):::def
  click dxos/plate "dxos/dxos/tree/main/packages/devtools/plate/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/conform --> dxos/plate
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/plate`](../../../packages/devtools/plate/docs/README.md) | &check; |

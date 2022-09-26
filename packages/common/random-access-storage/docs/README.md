# @dxos/random-access-storage

Multiple random storage types.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef default fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/random-access-storage("@dxos/random-access-storage"):::root
  click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/log`](../../log/docs/README.md) | &check; |

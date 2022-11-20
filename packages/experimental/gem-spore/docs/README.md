# @dxos/gem-spore

Gem spore.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Nodes

subgraph experimental [experimental]
  dxos/gem-spore("@dxos/gem-spore"):::root
  click dxos/gem-spore "dxos/dxos/tree/main/packages/experimental/gem-spore/docs"
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/experimental/gem-core/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/gem-spore --> dxos/gem-core
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../gem-core/docs/README.md) | &check; |

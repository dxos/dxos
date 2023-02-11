# @dxos/react-echo-graph

Low level components using gem library.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph experimental [experimental]
  style experimental fill:transparent
  dxos/react-echo-graph("@dxos/react-echo-graph"):::root
  click dxos/react-echo-graph "dxos/dxos/tree/main/packages/deprecated/archive/react-echo-graph/docs"
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/deprecated/archive/gem-core/docs"
  dxos/gem-spore("@dxos/gem-spore"):::def
  click dxos/gem-spore "dxos/dxos/tree/main/packages/deprecated/archive/gem-spore/docs"
end

%% Links
dxos/react-echo-graph --> dxos/gem-spore
dxos/gem-spore --> dxos/gem-core
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../gem-spore/docs/README.md) | &check; |

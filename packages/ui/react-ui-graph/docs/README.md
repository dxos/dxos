# @dxos/react-ui-graph

Gem spore.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph experimental [experimental]
  style experimental fill:transparent
  dxos/react-ui-graph("@dxos/react-ui-graph"):::root
  click dxos/react-ui-graph "dxos/dxos/tree/main/packages/ui/react-ui-graph/docs"
  dxos/gem-core("@dxos/gem-core"):::def
  click dxos/gem-core "dxos/dxos/tree/main/packages/experimental/gem-core/docs"
end

%% Links
dxos/react-ui-graph --> dxos/gem-core
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../gem-core/docs/README.md) | &check; |

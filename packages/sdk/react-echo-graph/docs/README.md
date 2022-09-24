# @dxos/react-echo-graph

Low level components using gem library.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/react-echo-graph fill:#fff,stroke-width:4px;

click dxos/gem-core "https:/github.com/dxos/dxos/tree/main/packages/gem/gem-core/docs";
click dxos/gem-spore "https:/github.com/dxos/dxos/tree/main/packages/gem/gem-spore/docs";

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/react-echo-graph("@dxos/react-echo-graph");
end

subgraph gem
  style gem fill:#d6e2f5,stroke:#fff;
  dxos/gem-core("@dxos/gem-core");
  dxos/gem-spore("@dxos/gem-spore");
end

dxos/react-echo-graph --> dxos/gem-spore;
dxos/gem-spore --> dxos/gem-core;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../../gem/gem-spore/docs/README.md) | &check; |

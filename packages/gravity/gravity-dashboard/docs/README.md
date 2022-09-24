# @dxos/gravity-dashboard

Gravity dashboard.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/gravity-dashboard fill:#fff,stroke-width:4px;

click dxos/gem-core "https:/github.com/dxos/dxos/tree/main/packages/gem/gem-core/docs";

subgraph gravity
  style gravity fill:#f5d6d7,stroke:#fff;
  dxos/gravity-dashboard("@dxos/gravity-dashboard");
end

subgraph gem
  style gem fill:#d6e2f5,stroke:#fff;
  dxos/gem-core("@dxos/gem-core");
end

dxos/gravity-dashboard --> dxos/gem-core;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |

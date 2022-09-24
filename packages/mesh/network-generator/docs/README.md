# @dxos/network-generator

Network generator.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/network-generator fill:#fff,stroke-width:4px;

click dxos/async "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/network-generator("@dxos/network-generator");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
end

dxos/network-generator --> dxos/async;
dxos/async --> dxos/debug;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |

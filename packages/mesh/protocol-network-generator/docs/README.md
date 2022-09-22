# @dxos/protocol-network-generator

Protocol network generator.
## Dependency Graph
```mermaid
flowchart LR;

subgraph mesh
  style mesh fill:#d6f5de,stroke:#fff;
  dxos/protocol-network-generator("@dxos/protocol-network-generator");
  dxos/network-generator("@dxos/network-generator");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
end

dxos/protocol-network-generator --> dxos/network-generator;
dxos/network-generator --> dxos/async;
dxos/async --> dxos/debug;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/network-generator`](../../network-generator/docs/README.md) | &check; |

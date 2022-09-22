# @dxos/beast

Code analyzer.
## Dependency Graph
```mermaid
flowchart LR;

subgraph tools
  style tools fill:#ded6f5,stroke:#fff;
  dxos/beast("@dxos/beast");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/log("@dxos/log");
end

dxos/beast --> dxos/log;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/log`](../../../packages/common/log/docs/README.md) | &check; |

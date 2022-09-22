# @dxos/random-access-storage

Multiple random storage types.
## Dependency Graph
```mermaid
flowchart LR;

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/random-access-storage("@dxos/random-access-storage");
  dxos/log("@dxos/log");
end

dxos/random-access-storage --> dxos/log;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/log`](../../log/docs/README.md) | &check; |

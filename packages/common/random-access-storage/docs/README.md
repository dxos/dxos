# @dxos/random-access-storage

Multiple random storage types.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/random-access-storage fill:#fff,stroke-width:4px;

click dxos/log "https:/github.com/dxos/dxos/tree/main/packages/common/log/docs";

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

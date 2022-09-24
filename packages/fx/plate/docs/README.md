# @dxos/plate



## Dependency Graph

```mermaid
flowchart LR;

style dxos/plate fill:#fff,stroke-width:4px;

click dxos/file "https:/github.com/dxos/dxos/tree/main/packages/fx/file/docs";

subgraph fx
  style fx fill:#f5d6e0,stroke:#fff;
  dxos/plate("@dxos/plate");
  dxos/file("@dxos/file");
end

dxos/plate --> dxos/file;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/file`](../../file/docs/README.md) | &check; |

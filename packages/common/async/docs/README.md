# @dxos/async

Async utils.

## Dependency Graph

```mermaid
flowchart LR;

style dxos/async fill:#fff,stroke-width:4px;

click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
end

dxos/async --> dxos/debug;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/debug`](../../debug/docs/README.md) | &check; |

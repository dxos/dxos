# @dxos/telemetry

Telemetry logging for product usage statistics

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph common [common]
  style common fill:#faebee,stroke:#333
  dxos/telemetry("@dxos/telemetry"):::root
  click dxos/telemetry "dxos/dxos/tree/main/packages/common/telemetry/docs"
  dxos/sentry("@dxos/sentry"):::def
  click dxos/sentry "dxos/dxos/tree/main/packages/common/sentry/docs"

  subgraph _ [ ]
    style _ fill:#faebee,stroke:#333,stroke-dasharray:5 5
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
  end
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/telemetry --> dxos/sentry
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/log`](../../log/docs/README.md) | &check; |
| [`@dxos/sentry`](../../sentry/docs/README.md) | &check; |

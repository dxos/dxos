# @dxos/telemetry

Telemetry logging for product usage statistics

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph common [common]
  style common fill:transparent
  dxos/telemetry("@dxos/telemetry"):::root
  click dxos/telemetry "dxos/dxos/tree/main/packages/common/telemetry/docs"
  dxos/sentry("@dxos/sentry"):::def
  click dxos/sentry "dxos/dxos/tree/main/packages/common/sentry/docs"

  subgraph _ [ ]
    style _ fill:transparent
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
  end
end

%% Links
dxos/telemetry --> dxos/sentry
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/log`](../../log/docs/README.md) | &check; |
| [`@dxos/sentry`](../../sentry/docs/README.md) | &check; |

# @dxos/spyglass

Code analyzer.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph experimental [experimental]
  style experimental fill:transparent
  dxos/spyglass("@dxos/spyglass"):::root
  click dxos/spyglass "dxos/dxos/tree/main/packages/experimental/spyglass/docs"
end

subgraph common [common]
  style common fill:transparent

  subgraph _ [ ]
    style _ fill:transparent
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

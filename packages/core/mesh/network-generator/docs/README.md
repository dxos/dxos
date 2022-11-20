# @dxos/network-generator

Network generator.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph core [core]
  style core fill:transparent

  subgraph mesh [mesh]
    style mesh fill:transparent
    dxos/network-generator("@dxos/network-generator"):::root
    click dxos/network-generator "dxos/dxos/tree/main/packages/core/mesh/network-generator/docs"
  end
end

subgraph common [common]
  style common fill:transparent
  dxos/context("@dxos/context"):::def
  click dxos/context "dxos/dxos/tree/main/packages/common/context/docs"

  subgraph _ [ ]
    style _ fill:transparent
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
  end
end

%% Links
dxos/async --> dxos/context
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../common/async/docs/README.md) | &check; |
| [`@dxos/context`](../../../../common/context/docs/README.md) |  |
| [`@dxos/debug`](../../../../common/debug/docs/README.md) |  |
| [`@dxos/keys`](../../../../common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../../common/log/docs/README.md) | &check; |
| [`@dxos/util`](../../../../common/util/docs/README.md) |  |

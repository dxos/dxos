# @dxos/protocols

Protobuf definitions for DXOS protocols.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph core [core]
  style core fill:#edabb3,stroke:#fff
  dxos/protocols("@dxos/protocols"):::root
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"
end

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/feeds("@dxos/feeds"):::def
  click dxos/feeds "dxos/dxos/tree/main/packages/common/feeds/docs"

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
  end
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocols --> dxos/codec-protobuf
dxos/protocols --> dxos/feeds
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/feeds`](../../../common/feeds/docs/README.md) | &check; |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

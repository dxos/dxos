# @dxos/rpc-tunnel

RPC ports over various transports.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph core [core]
  style core fill:#faebec,stroke:#333
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"

  subgraph mesh [mesh]
    style mesh fill:#ebfaef,stroke:#333
    dxos/rpc-tunnel("@dxos/rpc-tunnel"):::root
    click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/core/mesh/rpc-tunnel/docs"
    dxos/rpc("@dxos/rpc"):::def
    click dxos/rpc "dxos/dxos/tree/main/packages/core/mesh/rpc/docs"
  end
end

subgraph common [common]
  style common fill:#faebee,stroke:#333
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"

  subgraph _ [ ]
    style _ fill:#faebee,stroke:#333,stroke-dasharray:5 5
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/rpc-tunnel --> dxos/rpc
dxos/rpc --> dxos/protocols
dxos/protocols --> dxos/codec-protobuf
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../common/async/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/debug`](../../../../common/debug/docs/README.md) |  |
| [`@dxos/keys`](../../../../common/keys/docs/README.md) |  |
| [`@dxos/protocols`](../../../protocols/docs/README.md) |  |
| [`@dxos/rpc`](../../rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../../common/util/docs/README.md) |  |

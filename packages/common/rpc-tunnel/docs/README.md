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

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/rpc-tunnel("@dxos/rpc-tunnel"):::root
  click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/common/rpc-tunnel/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/rpc-tunnel --> dxos/rpc
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../async/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/debug`](../../debug/docs/README.md) |  |
| [`@dxos/protocols`](../../protocols/docs/README.md) |  |
| [`@dxos/rpc`](../../rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../util/docs/README.md) |  |

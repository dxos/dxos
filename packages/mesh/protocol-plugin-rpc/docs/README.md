# @dxos/protocol-plugin-rpc

Protocol plugin to be used with @dxos/rpc

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph mesh [mesh]
  style mesh fill:#b3e6c0,stroke:#fff
  dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc"):::root
  click dxos/protocol-plugin-rpc "dxos/dxos/tree/main/packages/mesh/protocol-plugin-rpc/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocol-plugin-rpc --> dxos/messaging
dxos/protocol-plugin-rpc --> dxos/mesh-protocol
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/messaging`](../../messaging/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

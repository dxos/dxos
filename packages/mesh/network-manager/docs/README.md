# @dxos/network-manager

Network Manager

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
  dxos/network-manager("@dxos/network-manager"):::root
  click dxos/network-manager "dxos/dxos/tree/main/packages/mesh/network-manager/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/network-manager --> dxos/credentials
dxos/network-manager --> dxos/messaging
dxos/network-manager --> dxos/protocol-plugin-presence
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/broadcast`](../../broadcast/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../echo/feed-store/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/messaging`](../../messaging/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../protocol-plugin-presence/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

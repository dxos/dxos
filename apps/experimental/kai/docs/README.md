# @dxos/kai

Kai Web shell.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph experimental [experimental]
  style experimental fill:#b8e6b3,stroke:#fff
  dxos/kai("@dxos/kai"):::root
  click dxos/kai "dxos/dxos/tree/main/apps/experimental/kai/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/kai --> dxos/client-testing
dxos/kai --> dxos/react-client
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../packages/common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../../packages/bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/broadcast`](../../../../packages/mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../../packages/sdk/client-services/docs/README.md) |  |
| [`@dxos/client-testing`](../../../../packages/sdk/client-testing/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../../packages/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../../packages/common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../../packages/common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../../packages/echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../../packages/common/feed-store/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../../packages/halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keyring`](../../../../packages/halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../../packages/common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../../packages/common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../../packages/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../../packages/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../../packages/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../../packages/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../../packages/echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../../packages/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../../packages/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../../packages/mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../../packages/common/protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../../../packages/common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../../packages/common/react-async/docs/README.md) | &check; |
| [`@dxos/react-client`](../../../../packages/sdk/react-client/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../../packages/common/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../../packages/common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../../packages/common/testutils/docs/README.md) |  |
| [`@dxos/util`](../../../../packages/common/util/docs/README.md) |  |

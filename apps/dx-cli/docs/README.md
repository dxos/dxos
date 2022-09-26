# @dxos/dx-cli

CLI Test using oclif.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph apps [apps]
  style apps fill:#abedeb,stroke:#fff
  dxos/dx-cli("@dxos/dx-cli"):::root
  click dxos/dx-cli "dxos/dxos/tree/main/apps/dx-cli/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/dx-cli --> dxos/client
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../packages/common/async/docs/README.md) | &check; |
| [`@dxos/broadcast`](../../../packages/mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../packages/sdk/client-services/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../packages/common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../packages/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../packages/common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../packages/common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../packages/echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../packages/common/feed-store/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../packages/halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keyring`](../../../packages/halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../packages/common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../packages/common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../packages/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../packages/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../packages/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../packages/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../packages/echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../packages/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../packages/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../packages/mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../packages/common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../packages/common/random-access-storage/docs/README.md) |  |
| [`@dxos/rpc`](../../../packages/common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../packages/common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../packages/common/testutils/docs/README.md) |  |
| [`@dxos/util`](../../../packages/common/util/docs/README.md) |  |

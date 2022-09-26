# @dxos/halo-app

HALO PWA

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
  dxos/halo-app("@dxos/halo-app"):::root
  click dxos/halo-app "dxos/dxos/tree/main/apps/halo/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/halo-app --> dxos/react-client
dxos/halo-app --> dxos/react-components
dxos/halo-app --> dxos/react-toolkit
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../packages/common/async/docs/README.md) |  |
| [`@dxos/bot-factory-client`](../../../packages/bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/broadcast`](../../../packages/mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../packages/sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../packages/sdk/client-services/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../packages/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../packages/common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../packages/common/debug/docs/README.md) |  |
| [`@dxos/echo-db`](../../../packages/echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../packages/common/feed-store/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../packages/halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keys`](../../../packages/common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../packages/common/log/docs/README.md) | &check; |
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
| [`@dxos/react-async`](../../../packages/common/react-async/docs/README.md) | &check; |
| [`@dxos/react-client`](../../../packages/sdk/react-client/docs/README.md) | &check; |
| [`@dxos/react-components`](../../../packages/sdk/react-components/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../../packages/sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../packages/sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../packages/sdk/registry-client/docs/README.md) |  |
| [`@dxos/rpc`](../../../packages/common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../packages/common/rpc-tunnel/docs/README.md) | &check; |
| [`@dxos/testutils`](../../../packages/common/testutils/docs/README.md) |  |
| [`@dxos/util`](../../../packages/common/util/docs/README.md) | &check; |

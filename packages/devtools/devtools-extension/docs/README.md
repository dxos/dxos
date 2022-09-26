# @dxos/devtools-extension



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph devtools [devtools]
  style devtools fill:#badade,stroke:#fff
  dxos/devtools-extension("@dxos/devtools-extension"):::root
  click dxos/devtools-extension "dxos/dxos/tree/main/packages/devtools/devtools-extension/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/devtools-extension --> dxos/devtools
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/bot-factory-client`](../../../bot/bot-factory-client/docs/README.md) |  |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../sdk/client-services/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/devtools`](../../devtools/docs/README.md) | &check; |
| [`@dxos/devtools-mesh`](../../devtools-mesh/docs/README.md) |  |
| [`@dxos/echo-db`](../../../echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) |  |
| [`@dxos/halo-protocol`](../../../halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keyring`](../../../halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) |  |
| [`@dxos/messenger-model`](../../../echo/messenger-model/docs/README.md) |  |
| [`@dxos/model-factory`](../../../echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/object-model`](../../../echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) |  |
| [`@dxos/react-client`](../../../sdk/react-client/docs/README.md) |  |
| [`@dxos/react-components`](../../../sdk/react-components/docs/README.md) |  |
| [`@dxos/react-registry-client`](../../../sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) |  |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../common/testutils/docs/README.md) |  |
| [`@dxos/text-model`](../../../echo/text-model/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

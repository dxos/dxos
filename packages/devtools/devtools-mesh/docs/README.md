# @dxos/devtools-mesh



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
  dxos/devtools-mesh("@dxos/devtools-mesh"):::root
  click dxos/devtools-mesh "dxos/dxos/tree/main/packages/devtools/devtools-mesh/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/devtools-mesh --> dxos/gem-spore
dxos/devtools-mesh --> dxos/react-components
dxos/devtools-mesh --> dxos/react-toolkit
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../../mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../sdk/client/docs/README.md) |  |
| [`@dxos/client-services`](../../../sdk/client-services/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../sdk/config/docs/README.md) |  |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/echo-db`](../../../echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) |  |
| [`@dxos/gem-core`](../../../gem/gem-core/docs/README.md) | &check; |
| [`@dxos/gem-spore`](../../../gem/gem-spore/docs/README.md) | &check; |
| [`@dxos/halo-protocol`](../../../halo/halo-protocol/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../mesh/messaging/docs/README.md) | &check; |
| [`@dxos/model-factory`](../../../echo/model-factory/docs/README.md) |  |
| [`@dxos/network-manager`](../../../mesh/network-manager/docs/README.md) | &check; |
| [`@dxos/object-model`](../../../echo/object-model/docs/README.md) |  |
| [`@dxos/protocol-plugin-presence`](../../../mesh/protocol-plugin-presence/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-replicator`](../../../mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) |  |
| [`@dxos/react-components`](../../../sdk/react-components/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../../sdk/react-registry-client/docs/README.md) |  |
| [`@dxos/react-toolkit`](../../../sdk/react-toolkit/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../../sdk/registry-client/docs/README.md) |  |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../common/rpc-tunnel/docs/README.md) |  |
| [`@dxos/testutils`](../../../common/testutils/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

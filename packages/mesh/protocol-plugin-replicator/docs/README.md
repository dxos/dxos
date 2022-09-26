# @dxos/protocol-plugin-replicator

Protocol plugin replicator.

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
  dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator"):::root
  click dxos/protocol-plugin-replicator "dxos/dxos/tree/main/packages/mesh/protocol-plugin-replicator/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocol-plugin-replicator --> dxos/keyring
dxos/protocol-plugin-replicator --> dxos/mesh-protocol
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/keyring`](../../../halo/keyring/docs/README.md) | &check; |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

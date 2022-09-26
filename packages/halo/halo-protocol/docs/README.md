# @dxos/halo-protocol

DXOS HALO Protocol

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph halo [halo]
  style halo fill:#cabade,stroke:#fff
  dxos/halo-protocol("@dxos/halo-protocol"):::root
  click dxos/halo-protocol "dxos/dxos/tree/main/packages/halo/halo-protocol/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/halo-protocol --> dxos/keyring
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/keyring`](../../keyring/docs/README.md) | &check; |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

# @dxos/protocol-network-generator

Protocol network generator.

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
  dxos/protocol-network-generator("@dxos/protocol-network-generator"):::root
  click dxos/protocol-network-generator "dxos/dxos/tree/main/packages/mesh/protocol-network-generator/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocol-network-generator --> dxos/network-generator
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) |  |
| [`@dxos/network-generator`](../../network-generator/docs/README.md) | &check; |

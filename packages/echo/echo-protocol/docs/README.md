# @dxos/echo-protocol

ECHO protocol definitions and utilities.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph echo [echo]
  style echo fill:#b3cae6,stroke:#fff
  dxos/echo-protocol("@dxos/echo-protocol"):::root
  click dxos/echo-protocol "dxos/dxos/tree/main/packages/echo/echo-protocol/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/echo-protocol --> dxos/credentials
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/feed-store`](../../feed-store/docs/README.md) | &check; |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

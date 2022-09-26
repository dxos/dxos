# @dxos/rpc

Tiny RPC library.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/rpc("@dxos/rpc"):::root
  click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../util/docs/README.md) | &check; |

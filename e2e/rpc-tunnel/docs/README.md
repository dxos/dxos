# @dxos/rpc-tunnel-e2e



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph e2e [e2e]
  style e2e fill:#abcced,stroke:#fff
  dxos/rpc-tunnel-e2e("@dxos/rpc-tunnel-e2e"):::root
  click dxos/rpc-tunnel-e2e "dxos/dxos/tree/main/e2e/rpc-tunnel/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/rpc-tunnel-e2e --> dxos/react-components
dxos/rpc-tunnel-e2e --> dxos/rpc-tunnel
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../packages/common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../packages/common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../packages/common/debug/docs/README.md) |  |
| [`@dxos/protocols`](../../../packages/common/protocols/docs/README.md) | &check; |
| [`@dxos/react-async`](../../../packages/common/react-async/docs/README.md) | &check; |
| [`@dxos/react-components`](../../../packages/sdk/react-components/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../packages/common/rpc/docs/README.md) | &check; |
| [`@dxos/rpc-tunnel`](../../../packages/common/rpc-tunnel/docs/README.md) | &check; |
| [`@dxos/util`](../../../packages/common/util/docs/README.md) |  |

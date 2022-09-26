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

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs"
  dxos/react-async("@dxos/react-async"):::def
  click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs"
  dxos/rpc("@dxos/rpc"):::def
  click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs"
  dxos/rpc-tunnel("@dxos/rpc-tunnel"):::def
  click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/common/rpc-tunnel/docs"

  subgraph common-excluded [common-excluded]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end

subgraph sdk [sdk]
  style sdk fill:#dddeba,stroke:#fff
  dxos/react-components("@dxos/react-components"):::def
  click dxos/react-components "dxos/dxos/tree/main/packages/sdk/react-components/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocols --> dxos/codec-protobuf
dxos/rpc-tunnel-e2e --> dxos/react-components
dxos/react-components --> dxos/react-async
dxos/util --> dxos/protocols
dxos/rpc-tunnel-e2e --> dxos/rpc-tunnel
dxos/rpc-tunnel --> dxos/rpc
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

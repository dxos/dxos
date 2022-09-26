# @dxos/react-toolkit

Application framework components

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef default fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph sdk [sdk]
  style sdk fill:#dddeba,stroke:#fff
  dxos/react-toolkit("@dxos/react-toolkit"):::root
  click dxos/react-toolkit "dxos/dxos/tree/main/packages/sdk/react-toolkit/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/react-toolkit --> dxos/react-async
dxos/react-toolkit --> dxos/react-registry-client
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../config/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../react-registry-client/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../registry-client/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

# @dxos/vite-plugin

Plugin to enable Vite to build DXOS apps.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph tools [tools]
  style tools fill:#bbabed,stroke:#fff
  dxos/vite-plugin("@dxos/vite-plugin"):::root
  click dxos/vite-plugin "dxos/dxos/tree/main/tools/vite-plugin/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/vite-plugin --> dxos/config
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/debug`](../../../packages/common/debug/docs/README.md) |  |
| [`@dxos/protocols`](../../../packages/common/protocols/docs/README.md) |  |
| [`@dxos/util`](../../../packages/common/util/docs/README.md) |  |

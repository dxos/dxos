# @dxos/vite-plugin

Plugin to enable Vite to build DXOS apps.
## Dependency Graph
```mermaid
flowchart LR;

subgraph tools
  style tools fill:#ded6f5,stroke:#fff;
  dxos/vite-plugin("@dxos/vite-plugin");
end

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/config("@dxos/config");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/debug("@dxos/debug");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
end

dxos/vite-plugin --> dxos/config;
dxos/protocols --> dxos/codec-protobuf;
dxos/config --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../../packages/common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../packages/sdk/config/docs/README.md) | &check; |
| [`@dxos/debug`](../../../packages/common/debug/docs/README.md) |  |
| [`@dxos/protocols`](../../../packages/common/protocols/docs/README.md) |  |
| [`@dxos/util`](../../../packages/common/util/docs/README.md) |  |

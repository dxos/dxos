# @dxos/rpc-tunnel-e2e


## Dependency Graph
```mermaid
flowchart LR;

subgraph e2e
  style e2e fill:#d6e5f5,stroke:#fff;
  dxos/rpc-tunnel-e2e("@dxos/rpc-tunnel-e2e");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/protocols("@dxos/protocols");
  dxos/react-async("@dxos/react-async");
  dxos/util("@dxos/util");
  dxos/rpc("@dxos/rpc");
  dxos/rpc-tunnel("@dxos/rpc-tunnel");
end

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/react-components("@dxos/react-components");
end

dxos/async --> dxos/debug;
dxos/protocols --> dxos/codec-protobuf;
dxos/rpc-tunnel-e2e --> dxos/react-components;
dxos/react-components --> dxos/async;
dxos/react-components --> dxos/react-async;
dxos/react-components --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/rpc --> dxos/async;
dxos/rpc --> dxos/util;
dxos/rpc-tunnel-e2e --> dxos/rpc-tunnel;
dxos/rpc-tunnel --> dxos/rpc;
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

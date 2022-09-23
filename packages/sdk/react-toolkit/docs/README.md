# @dxos/react-toolkit

Application framework components
## Dependency Graph
```mermaid
flowchart LR;

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/react-toolkit("@dxos/react-toolkit");
  dxos/react-registry-client("@dxos/react-registry-client");
  dxos/config("@dxos/config");
  dxos/registry-client("@dxos/registry-client");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/debug("@dxos/debug");
  dxos/protocols("@dxos/protocols");
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/react-async("@dxos/react-async");
  dxos/util("@dxos/util");
end

dxos/protocols --> dxos/codec-protobuf;
dxos/react-toolkit --> dxos/react-async;
dxos/react-toolkit --> dxos/react-registry-client;
dxos/config --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/react-registry-client --> dxos/registry-client;
dxos/registry-client --> dxos/config;
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

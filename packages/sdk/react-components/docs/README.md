# @dxos/react-components

Low-level material components.
## Dependency Graph
```mermaid
flowchart LR;

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/react-components("@dxos/react-components");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/react-async("@dxos/react-async");
  dxos/util("@dxos/util");
  dxos/protocols("@dxos/protocols");
  dxos/codec-protobuf("@dxos/codec-protobuf");
end

dxos/react-components --> dxos/async;
dxos/async --> dxos/debug;
dxos/react-components --> dxos/react-async;
dxos/react-components --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

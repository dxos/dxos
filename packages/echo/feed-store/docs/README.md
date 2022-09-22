# @dxos/feed-store

A consistent store for your hypercore feeds.
## Dependency Graph
```mermaid
flowchart LR;

subgraph echo
  style echo fill:#d6e4f5,stroke:#fff;
  dxos/feed-store("@dxos/feed-store");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/async("@dxos/async");
  dxos/debug("@dxos/debug");
  dxos/util("@dxos/util");
  dxos/protocols("@dxos/protocols");
  dxos/codec-protobuf("@dxos/codec-protobuf");
end

dxos/feed-store --> dxos/async;
dxos/async --> dxos/debug;
dxos/feed-store --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;
```
## Dependencies
| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

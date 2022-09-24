# @dxos/react-registry-client

React registry client API

## Dependency Graph

```mermaid
flowchart LR;

style dxos/react-registry-client fill:#fff,stroke-width:4px;

click dxos/config "https:/github.com/dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";
click dxos/registry-client "https:/github.com/dxos/dxos/tree/main/packages/sdk/registry-client/docs";

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/react-registry-client("@dxos/react-registry-client");
  dxos/config("@dxos/config");
  dxos/registry-client("@dxos/registry-client");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/debug("@dxos/debug");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
end

dxos/protocols --> dxos/codec-protobuf;
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
| [`@dxos/config`](../../config/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) |  |
| [`@dxos/registry-client`](../../registry-client/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

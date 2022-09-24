# @dxos/registry-client

DXNS API

## Dependency Graph

```mermaid
flowchart LR;

style dxos/registry-client fill:#fff,stroke-width:4px;

click dxos/codec-protobuf "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "https:/github.com/dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/debug "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/protocols "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/util "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

subgraph sdk
  style sdk fill:#f4f5d6,stroke:#fff;
  dxos/registry-client("@dxos/registry-client");
  dxos/config("@dxos/config");
end

subgraph common
  style common fill:#f5d6dd,stroke:#fff;
  dxos/codec-protobuf("@dxos/codec-protobuf");
  dxos/debug("@dxos/debug");
  dxos/protocols("@dxos/protocols");
  dxos/util("@dxos/util");
end

dxos/registry-client --> dxos/config;
dxos/protocols --> dxos/codec-protobuf;
dxos/config --> dxos/util;
dxos/util --> dxos/debug;
dxos/util --> dxos/protocols;
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/config`](../../config/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

# @dxos/react-registry-client

React registry client API

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/protocols --> dxos/codec-protobuf;
dxos/react-registry-client --> dxos/registry-client;
dxos/registry-client --> dxos/config;
dxos/util --> dxos/protocols;

%% Sections
subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/config("@dxos/config")
  dxos/react-registry-client("@dxos/react-registry-client")
  dxos/registry-client("@dxos/registry-client")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/protocols("@dxos/protocols")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/debug("@dxos/debug")
    dxos/util("@dxos/util")
  end
end


%% Hyperlinks
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/registry-client "dxos/dxos/tree/main/packages/sdk/registry-client/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/react-registry-client:::rootNode

dxos/codec-protobuf:::defaultNode
dxos/config:::defaultNode
dxos/debug:::defaultNode
dxos/protocols:::defaultNode
dxos/registry-client:::defaultNode
dxos/util:::defaultNode
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

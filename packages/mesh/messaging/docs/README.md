# @dxos/messaging

Messaging

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/messaging --> dxos/rpc;
dxos/protocols --> dxos/codec-protobuf;
dxos/rpc --> dxos/protocols;

%% Sections
subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/messaging("@dxos/messaging")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/protocols("@dxos/protocols")
  dxos/rpc("@dxos/rpc")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/keys("@dxos/keys")
    dxos/log("@dxos/log")
    dxos/util("@dxos/util")
  end
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/rpc "dxos/dxos/tree/main/packages/common/rpc/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/messaging:::rootNode

dxos/async:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/debug:::defaultNode
dxos/keys:::defaultNode
dxos/log:::defaultNode
dxos/protocols:::defaultNode
dxos/rpc:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../common/rpc/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

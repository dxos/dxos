# @dxos/protocol-plugin-presence

Protocol plugin presence.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/broadcast --> dxos/crypto;
dxos/crypto --> dxos/protocols;
dxos/protocol-plugin-presence --> dxos/broadcast;
dxos/protocol-plugin-presence --> dxos/mesh-protocol;
dxos/protocols --> dxos/codec-protobuf;
dxos/util --> dxos/protocols;

%% Sections
subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/broadcast("@dxos/broadcast")
  dxos/mesh-protocol("@dxos/mesh-protocol")
  dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/protocols("@dxos/protocols")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/util("@dxos/util")
  end
end


%% Hyperlinks
click dxos/async href "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/broadcast href "https:/github.com/dxos/dxos/tree/main/packages/mesh/broadcast/docs";
click dxos/codec-protobuf href "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/crypto href "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/mesh-protocol href "https:/github.com/dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/protocols href "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/util href "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/protocol-plugin-presence:::rootNode

dxos/async:::defaultNode
dxos/broadcast:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/crypto:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/protocols:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../broadcast/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../mesh-protocol/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

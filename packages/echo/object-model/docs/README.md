# @dxos/object-model

ECHO object model.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/crypto --> dxos/protocols;
dxos/echo-protocol --> dxos/credentials;
dxos/object-model --> dxos/echo-protocol;
dxos/object-model --> dxos/model-factory;
dxos/protocols --> dxos/codec-protobuf;
dxos/util --> dxos/protocols;

%% Sections
subgraph echo
  style echo fill:#b3cae6,stroke:#fff;

  dxos/echo-protocol("@dxos/echo-protocol")
  dxos/feed-store("@dxos/feed-store")
  dxos/model-factory("@dxos/model-factory")
  dxos/object-model("@dxos/object-model")
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

subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/credentials("@dxos/credentials")
end

subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/mesh-protocol("@dxos/mesh-protocol")
end


%% Hyperlinks
click dxos/async href "https:/github.com/dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf href "https:/github.com/dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/credentials href "https:/github.com/dxos/dxos/tree/main/packages/halo/credentials/docs";
click dxos/crypto href "https:/github.com/dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug href "https:/github.com/dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/echo-protocol href "https:/github.com/dxos/dxos/tree/main/packages/echo/echo-protocol/docs";
click dxos/feed-store href "https:/github.com/dxos/dxos/tree/main/packages/echo/feed-store/docs";
click dxos/model-factory href "https:/github.com/dxos/dxos/tree/main/packages/echo/model-factory/docs";
click dxos/protocols href "https:/github.com/dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/util href "https:/github.com/dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/object-model:::rootNode

dxos/async:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/credentials:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/echo-protocol:::defaultNode
dxos/feed-store:::defaultNode
dxos/model-factory:::defaultNode
dxos/protocols:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/echo-protocol`](../../echo-protocol/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../feed-store/docs/README.md) |  |
| [`@dxos/model-factory`](../../model-factory/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

# @dxos/messenger-model



## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph echo [echo]
  style echo fill:#b3cae6,stroke:#fff
  dxos/messenger-model("@dxos/messenger-model"):::root
  click dxos/messenger-model "dxos/dxos/tree/main/packages/echo/messenger-model/docs"
  dxos/echo-protocol("@dxos/echo-protocol"):::def
  click dxos/echo-protocol "dxos/dxos/tree/main/packages/echo/echo-protocol/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/echo/feed-store/docs"
  dxos/model-factory("@dxos/model-factory"):::def
  click dxos/model-factory "dxos/dxos/tree/main/packages/echo/model-factory/docs"
end

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/crypto("@dxos/crypto"):::def
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs"

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end

subgraph halo [halo]
  style halo fill:#cabade,stroke:#fff
  dxos/credentials("@dxos/credentials"):::def
  click dxos/credentials "dxos/dxos/tree/main/packages/halo/credentials/docs"
end

subgraph mesh [mesh]
  style mesh fill:#b3e6c0,stroke:#fff
  dxos/mesh-protocol("@dxos/mesh-protocol"):::def
  click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/messenger-model --> dxos/echo-protocol
dxos/echo-protocol --> dxos/credentials
dxos/credentials --> dxos/crypto
dxos/crypto --> dxos/protocols
dxos/protocols --> dxos/codec-protobuf
dxos/credentials --> dxos/feed-store
dxos/util --> dxos/protocols
dxos/credentials --> dxos/mesh-protocol
dxos/messenger-model --> dxos/model-factory
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/credentials`](../../../halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/echo-protocol`](../../echo-protocol/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../feed-store/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/model-factory`](../../model-factory/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

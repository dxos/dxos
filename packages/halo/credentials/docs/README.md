# @dxos/credentials

DXOS Credentials

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/credentials --> dxos/crypto;
dxos/credentials --> dxos/feed-store;
dxos/credentials --> dxos/mesh-protocol;
dxos/feed-store --> dxos/keyring;
dxos/keyring --> dxos/protocols;
dxos/keyring --> dxos/random-access-storage;
dxos/mesh-protocol --> dxos/codec-protobuf;
dxos/protocols --> dxos/codec-protobuf;

%% Sections
subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/credentials("@dxos/credentials")
  dxos/keyring("@dxos/keyring")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/feed-store("@dxos/feed-store")
  dxos/protocols("@dxos/protocols")
  dxos/random-access-storage("@dxos/random-access-storage")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/keys("@dxos/keys")
    dxos/log("@dxos/log")
    dxos/util("@dxos/util")
  end
end

subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/mesh-protocol("@dxos/mesh-protocol")
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs";
click dxos/keyring "dxos/dxos/tree/main/packages/halo/keyring/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/mesh-protocol "dxos/dxos/tree/main/packages/mesh/mesh-protocol/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/credentials:::rootNode

dxos/async:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/crypto:::defaultNode
dxos/debug:::defaultNode
dxos/feed-store:::defaultNode
dxos/keyring:::defaultNode
dxos/keys:::defaultNode
dxos/log:::defaultNode
dxos/mesh-protocol:::defaultNode
dxos/protocols:::defaultNode
dxos/random-access-storage:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../common/feed-store/docs/README.md) | &check; |
| [`@dxos/keyring`](../../keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

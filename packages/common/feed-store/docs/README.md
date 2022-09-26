# @dxos/feed-store

A consistent store for hypercore feeds.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/feed-store --> dxos/keyring;
dxos/keyring --> dxos/protocols;
dxos/keyring --> dxos/random-access-storage;
dxos/protocols --> dxos/codec-protobuf;

%% Sections
subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
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

subgraph halo
  style halo fill:#cabade,stroke:#fff;

  dxos/keyring("@dxos/keyring")
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/keyring "dxos/dxos/tree/main/packages/halo/keyring/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";
click dxos/log "dxos/dxos/tree/main/packages/common/log/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";
click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/feed-store:::rootNode

dxos/async:::defaultNode
dxos/codec-protobuf:::defaultNode
dxos/debug:::defaultNode
dxos/keyring:::defaultNode
dxos/keys:::defaultNode
dxos/log:::defaultNode
dxos/protocols:::defaultNode
dxos/random-access-storage:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/debug`](../../debug/docs/README.md) |  |
| [`@dxos/keyring`](../../../halo/keyring/docs/README.md) | &check; |
| [`@dxos/keys`](../../keys/docs/README.md) | &check; |
| [`@dxos/log`](../../log/docs/README.md) | &check; |
| [`@dxos/protocols`](../../protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../random-access-storage/docs/README.md) |  |
| [`@dxos/util`](../../util/docs/README.md) | &check; |

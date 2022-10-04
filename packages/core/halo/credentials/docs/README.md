# @dxos/credentials

DXOS Credentials

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph core [core]
  style core fill:#faebec,stroke:#333
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"

  subgraph halo [halo]
    style halo fill:#f1ebfa,stroke:#333
    dxos/credentials("@dxos/credentials"):::root
    click dxos/credentials "dxos/dxos/tree/main/packages/core/halo/credentials/docs"
  end

  subgraph mesh [mesh]
    style mesh fill:#ebfaef,stroke:#333
    dxos/mesh-protocol("@dxos/mesh-protocol"):::def
    click dxos/mesh-protocol "dxos/dxos/tree/main/packages/core/mesh/mesh-protocol/docs"
  end
end

subgraph common [common]
  style common fill:#faebee,stroke:#333
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/crypto("@dxos/crypto"):::def
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs"

  subgraph _ [ ]
    style _ fill:#faebee,stroke:#333,stroke-dasharray:5 5
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/credentials --> dxos/crypto
dxos/credentials --> dxos/feed-store
dxos/credentials --> dxos/mesh-protocol
dxos/mesh-protocol --> dxos/codec-protobuf
dxos/credentials --> dxos/protocols
dxos/protocols --> dxos/codec-protobuf
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/crypto`](../../../../common/crypto/docs/README.md) | &check; |
| [`@dxos/debug`](../../../../common/debug/docs/README.md) | &check; |
| [`@dxos/feed-store`](../../../../common/feed-store/docs/README.md) | &check; |
| [`@dxos/keys`](../../../../common/keys/docs/README.md) | &check; |
| [`@dxos/log`](../../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../mesh/mesh-protocol/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../protocols/docs/README.md) | &check; |
| [`@dxos/util`](../../../../common/util/docs/README.md) | &check; |

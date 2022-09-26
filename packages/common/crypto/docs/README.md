# @dxos/crypto

Basic crypto key utils

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/crypto("@dxos/crypto"):::root
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/crypto --> dxos/protocols
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/protocols`](../../protocols/docs/README.md) | &check; |

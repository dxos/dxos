# @dxos/protocols

Protobuf definitions for DXOS protocols.

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
  dxos/protocols("@dxos/protocols"):::root
  click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocols --> dxos/codec-protobuf
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) | &check; |
| [`@dxos/keys`](../../keys/docs/README.md) | &check; |

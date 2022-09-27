# @dxos/crypto

Basic crypto key utils

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/crypto --> dxos/protocols;
dxos/protocols --> dxos/codec-protobuf;

%% Sections
subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/crypto("@dxos/crypto")
  dxos/protocols("@dxos/protocols")
end


%% Hyperlinks
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";
click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:2px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/crypto:::rootNode

dxos/codec-protobuf:::defaultNode
dxos/protocols:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) |  |
| [`@dxos/protocols`](../../protocols/docs/README.md) | &check; |

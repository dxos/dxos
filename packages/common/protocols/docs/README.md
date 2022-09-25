# @dxos/protocols

Protobuf definitions for DXOS protocols.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/protocols --> dxos/codec-protobuf;

%% Sections
subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/codec-protobuf("@dxos/codec-protobuf")
  dxos/protocols("@dxos/protocols")
end


%% Hyperlinks
click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/protocols:::rootNode

dxos/codec-protobuf:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../codec-protobuf/docs/README.md) | &check; |

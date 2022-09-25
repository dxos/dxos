# @dxos/crypto

Basic crypto key utils

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links

%% Sections
subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/crypto("@dxos/crypto")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/keys("@dxos/keys")
  end
end


%% Hyperlinks
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/crypto:::rootNode

dxos/keys:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/keys`](../../keys/docs/README.md) | &check; |

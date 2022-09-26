# @dxos/react-components

Low-level material components.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links
dxos/react-components --> dxos/react-async;

%% Sections
subgraph sdk
  style sdk fill:#dddeba,stroke:#fff;

  dxos/react-components("@dxos/react-components")
end

subgraph common
  style common fill:#debac2,stroke:#fff;

  dxos/react-async("@dxos/react-async")

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/keys("@dxos/keys")
    dxos/util("@dxos/util")
  end
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";
click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs";
click dxos/util "dxos/dxos/tree/main/packages/common/util/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/react-components:::rootNode

dxos/async:::defaultNode
dxos/debug:::defaultNode
dxos/keys:::defaultNode
dxos/react-async:::defaultNode
dxos/util:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/keys`](../../../common/keys/docs/README.md) | &check; |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) | &check; |
| [`@dxos/util`](../../../common/util/docs/README.md) | &check; |

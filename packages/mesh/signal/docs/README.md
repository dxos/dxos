# @dxos/signal

DXOS signal server.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Links

%% Sections
subgraph mesh
  style mesh fill:#b3e6c0,stroke:#fff;

  dxos/signal("@dxos/signal")
end

subgraph common
  style common fill:#debac2,stroke:#fff;


  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5;

    dxos/async("@dxos/async")
    dxos/debug("@dxos/debug")
    dxos/keys("@dxos/keys")
  end
end


%% Hyperlinks
click dxos/async "dxos/dxos/tree/main/packages/common/async/docs";
click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs";
click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs";

%% Styles
classDef rootNode fill:#fff,stroke:#333,stroke-width:4px
classDef defaultNode fill:#fff,stroke:#333,stroke-width:1px
linkStyle default stroke:#333,stroke-width:1px

dxos/signal:::rootNode

dxos/async:::defaultNode
dxos/debug:::defaultNode
dxos/keys:::defaultNode
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../common/async/docs/README.md) | &check; |
| [`@dxos/debug`](../../../common/debug/docs/README.md) |  |
| [`@dxos/keys`](../../../common/keys/docs/README.md) |  |

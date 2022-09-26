# @dxos/react-toolkit

Application framework components

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph sdk [sdk]
  style sdk fill:#dddeba,stroke:#fff
  dxos/react-toolkit("@dxos/react-toolkit"):::root
  click dxos/react-toolkit "dxos/dxos/tree/main/packages/sdk/react-toolkit/docs"
  dxos/react-registry-client("@dxos/react-registry-client"):::def
  click dxos/react-registry-client "dxos/dxos/tree/main/packages/sdk/react-registry-client/docs"
  dxos/config("@dxos/config"):::def
  click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs"
  dxos/registry-client("@dxos/registry-client"):::def
  click dxos/registry-client "dxos/dxos/tree/main/packages/sdk/registry-client/docs"
end

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/common/protocols/docs"
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/react-async("@dxos/react-async"):::def
  click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs"

  subgraph common-excluded [common-excluded]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/protocols --> dxos/codec-protobuf
dxos/react-toolkit --> dxos/react-async
dxos/react-toolkit --> dxos/react-registry-client
dxos/util --> dxos/protocols
dxos/react-registry-client --> dxos/registry-client
dxos/registry-client --> dxos/config
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/codec-protobuf`](../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../config/docs/README.md) |  |
| [`@dxos/debug`](../../../common/debug/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../common/protocols/docs/README.md) | &check; |
| [`@dxos/react-async`](../../../common/react-async/docs/README.md) | &check; |
| [`@dxos/react-registry-client`](../../react-registry-client/docs/README.md) | &check; |
| [`@dxos/registry-client`](../../registry-client/docs/README.md) |  |
| [`@dxos/util`](../../../common/util/docs/README.md) |  |

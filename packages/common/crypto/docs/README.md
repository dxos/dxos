# @dxos/crypto

Basic cross-platform crypto utils.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph common [common]
  style common fill:transparent
  dxos/crypto("@dxos/crypto"):::root
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"

  subgraph _ [ ]
    style _ fill:transparent
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
  end
end
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/debug`](../../debug/docs/README.md) |  |
| [`@dxos/keys`](../../keys/docs/README.md) | &check; |

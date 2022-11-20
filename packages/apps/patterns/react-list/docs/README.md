# @dxos/react-list

A list editing experience component for DXOS.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes



%% Nodes

subgraph apps [apps]
  style apps fill:transparent

  subgraph patterns [patterns]
    style patterns fill:transparent
    dxos/react-list("@dxos/react-list"):::root
    click dxos/react-list "dxos/dxos/tree/main/packages/apps/patterns/react-list/docs"
    dxos/react-appkit("@dxos/react-appkit"):::def
    click dxos/react-appkit "dxos/dxos/tree/main/packages/apps/patterns/react-appkit/docs"
  end
end

subgraph sdk [sdk]
  style sdk fill:transparent
  dxos/client("@dxos/client"):::def
  click dxos/client "dxos/dxos/tree/main/packages/sdk/client/docs"
  dxos/client-services("@dxos/client-services"):::def
  click dxos/client-services "dxos/dxos/tree/main/packages/sdk/client-services/docs"
  dxos/config("@dxos/config"):::def
  click dxos/config "dxos/dxos/tree/main/packages/sdk/config/docs"
  dxos/react-client("@dxos/react-client"):::def
  click dxos/react-client "dxos/dxos/tree/main/packages/sdk/react-client/docs"
  dxos/react-uikit("@dxos/react-uikit"):::def
  click dxos/react-uikit "dxos/dxos/tree/main/packages/sdk/react-uikit/docs"
end

subgraph common [common]
  style common fill:transparent
  dxos/context("@dxos/context"):::def
  click dxos/context "dxos/dxos/tree/main/packages/common/context/docs"
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/hypercore("@dxos/hypercore"):::def
  click dxos/hypercore "dxos/dxos/tree/main/packages/common/hypercore/docs"
  dxos/crypto("@dxos/crypto"):::def
  click dxos/crypto "dxos/dxos/tree/main/packages/common/crypto/docs"
  dxos/random-access-storage("@dxos/random-access-storage"):::def
  click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs"
  dxos/timeframe("@dxos/timeframe"):::def
  click dxos/timeframe "dxos/dxos/tree/main/packages/common/timeframe/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs"
  dxos/react-async("@dxos/react-async"):::def
  click dxos/react-async "dxos/dxos/tree/main/packages/common/react-async/docs"
  dxos/react-ui("@dxos/react-ui"):::def
  click dxos/react-ui "dxos/dxos/tree/main/packages/common/react-ui/docs"
  dxos/sentry("@dxos/sentry"):::def
  click dxos/sentry "dxos/dxos/tree/main/packages/common/sentry/docs"
  dxos/telemetry("@dxos/telemetry"):::def
  click dxos/telemetry "dxos/dxos/tree/main/packages/common/telemetry/docs"

  subgraph _ [ ]
    style _ fill:transparent
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
  end
end

subgraph core [core]
  style core fill:transparent
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"

  subgraph halo [halo]
    style halo fill:transparent
    dxos/credentials("@dxos/credentials"):::def
    click dxos/credentials "dxos/dxos/tree/main/packages/core/halo/credentials/docs"
    dxos/keyring("@dxos/keyring"):::def
    click dxos/keyring "dxos/dxos/tree/main/packages/core/halo/keyring/docs"
  end

  subgraph mesh [mesh]
    style mesh fill:transparent
    dxos/mesh-protocol("@dxos/mesh-protocol"):::def
    click dxos/mesh-protocol "dxos/dxos/tree/main/packages/core/mesh/mesh-protocol/docs"
    dxos/messaging("@dxos/messaging"):::def
    click dxos/messaging "dxos/dxos/tree/main/packages/core/mesh/messaging/docs"
    dxos/rpc("@dxos/rpc"):::def
    click dxos/rpc "dxos/dxos/tree/main/packages/core/mesh/rpc/docs"
    dxos/network-manager("@dxos/network-manager"):::def
    click dxos/network-manager "dxos/dxos/tree/main/packages/core/mesh/network-manager/docs"
    dxos/protocol-plugin-presence("@dxos/protocol-plugin-presence"):::def
    click dxos/protocol-plugin-presence "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-presence/docs"
    dxos/broadcast("@dxos/broadcast"):::def
    click dxos/broadcast "dxos/dxos/tree/main/packages/core/mesh/broadcast/docs"
    dxos/protocol-plugin-replicator("@dxos/protocol-plugin-replicator"):::def
    click dxos/protocol-plugin-replicator "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-replicator/docs"
    dxos/network-generator("@dxos/network-generator"):::def
    click dxos/network-generator "dxos/dxos/tree/main/packages/core/mesh/network-generator/docs"
    dxos/protocol-plugin-rpc("@dxos/protocol-plugin-rpc"):::def
    click dxos/protocol-plugin-rpc "dxos/dxos/tree/main/packages/core/mesh/protocol-plugin-rpc/docs"
    dxos/rpc-tunnel("@dxos/rpc-tunnel"):::def
    click dxos/rpc-tunnel "dxos/dxos/tree/main/packages/core/mesh/rpc-tunnel/docs"
  end

  subgraph echo [echo]
    style echo fill:transparent
    dxos/echo-db("@dxos/echo-db"):::def
    click dxos/echo-db "dxos/dxos/tree/main/packages/core/echo/echo-db/docs"
    dxos/model-factory("@dxos/model-factory"):::def
    click dxos/model-factory "dxos/dxos/tree/main/packages/core/echo/model-factory/docs"
    dxos/object-model("@dxos/object-model"):::def
    click dxos/object-model "dxos/dxos/tree/main/packages/core/echo/object-model/docs"
    dxos/text-model("@dxos/text-model"):::def
    click dxos/text-model "dxos/dxos/tree/main/packages/core/echo/text-model/docs"
  end
end

%% Links
dxos/async --> dxos/context
dxos/client --> dxos/client-services
dxos/client-services --> dxos/config
dxos/config --> dxos/protocols
dxos/protocols --> dxos/hypercore
dxos/hypercore --> dxos/codec-protobuf
dxos/hypercore --> dxos/crypto
dxos/hypercore --> dxos/random-access-storage
dxos/protocols --> dxos/timeframe
dxos/credentials --> dxos/feed-store
dxos/feed-store --> dxos/hypercore
dxos/credentials --> dxos/keyring
dxos/keyring --> dxos/protocols
dxos/credentials --> dxos/mesh-protocol
dxos/mesh-protocol --> dxos/codec-protobuf
dxos/messaging --> dxos/rpc
dxos/rpc --> dxos/protocols
dxos/model-factory --> dxos/feed-store
dxos/model-factory --> dxos/protocols
dxos/echo-db --> dxos/network-manager
dxos/network-manager --> dxos/credentials
dxos/network-manager --> dxos/messaging
dxos/network-manager --> dxos/protocol-plugin-presence
dxos/protocol-plugin-presence --> dxos/broadcast
dxos/broadcast --> dxos/protocols
dxos/protocol-plugin-presence --> dxos/mesh-protocol
dxos/echo-db --> dxos/object-model
dxos/object-model --> dxos/model-factory
dxos/echo-db --> dxos/protocol-plugin-replicator
dxos/protocol-plugin-replicator --> dxos/keyring
dxos/protocol-plugin-replicator --> dxos/mesh-protocol
dxos/protocol-plugin-replicator --> dxos/network-generator
dxos/echo-db --> dxos/protocol-plugin-rpc
dxos/protocol-plugin-rpc --> dxos/mesh-protocol
dxos/protocol-plugin-rpc --> dxos/messaging
dxos/client-services --> dxos/text-model
dxos/text-model --> dxos/echo-db
dxos/client --> dxos/rpc-tunnel
dxos/rpc-tunnel --> dxos/rpc
dxos/react-list --> dxos/react-appkit
dxos/react-client --> dxos/client
dxos/react-client --> dxos/react-async
dxos/react-appkit --> dxos/react-uikit
dxos/react-uikit --> dxos/react-client
dxos/react-uikit --> dxos/react-ui
dxos/react-appkit --> dxos/telemetry
dxos/telemetry --> dxos/sentry
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../common/async/docs/README.md) |  |
| [`@dxos/broadcast`](../../../../core/mesh/broadcast/docs/README.md) |  |
| [`@dxos/client`](../../../../sdk/client/docs/README.md) | &check; |
| [`@dxos/client-services`](../../../../sdk/client-services/docs/README.md) |  |
| [`@dxos/codec-protobuf`](../../../../common/codec-protobuf/docs/README.md) |  |
| [`@dxos/config`](../../../../sdk/config/docs/README.md) | &check; |
| [`@dxos/context`](../../../../common/context/docs/README.md) |  |
| [`@dxos/credentials`](../../../../core/halo/credentials/docs/README.md) |  |
| [`@dxos/crypto`](../../../../common/crypto/docs/README.md) |  |
| [`@dxos/debug`](../../../../common/debug/docs/README.md) |  |
| [`@dxos/echo-db`](../../../../core/echo/echo-db/docs/README.md) |  |
| [`@dxos/feed-store`](../../../../common/feed-store/docs/README.md) |  |
| [`@dxos/hypercore`](../../../../common/hypercore/docs/README.md) |  |
| [`@dxos/keyring`](../../../../core/halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../../common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../../common/log/docs/README.md) |  |
| [`@dxos/mesh-protocol`](../../../../core/mesh/mesh-protocol/docs/README.md) |  |
| [`@dxos/messaging`](../../../../core/mesh/messaging/docs/README.md) |  |
| [`@dxos/model-factory`](../../../../core/echo/model-factory/docs/README.md) |  |
| [`@dxos/network-generator`](../../../../core/mesh/network-generator/docs/README.md) |  |
| [`@dxos/network-manager`](../../../../core/mesh/network-manager/docs/README.md) |  |
| [`@dxos/object-model`](../../../../core/echo/object-model/docs/README.md) | &check; |
| [`@dxos/protocol-plugin-presence`](../../../../core/mesh/protocol-plugin-presence/docs/README.md) |  |
| [`@dxos/protocol-plugin-replicator`](../../../../core/mesh/protocol-plugin-replicator/docs/README.md) |  |
| [`@dxos/protocol-plugin-rpc`](../../../../core/mesh/protocol-plugin-rpc/docs/README.md) |  |
| [`@dxos/protocols`](../../../../core/protocols/docs/README.md) |  |
| [`@dxos/random-access-storage`](../../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/react-appkit`](../../react-appkit/docs/README.md) | &check; |
| [`@dxos/react-async`](../../../../common/react-async/docs/README.md) | &check; |
| [`@dxos/react-client`](../../../../sdk/react-client/docs/README.md) | &check; |
| [`@dxos/react-ui`](../../../../common/react-ui/docs/README.md) | &check; |
| [`@dxos/react-uikit`](../../../../sdk/react-uikit/docs/README.md) | &check; |
| [`@dxos/rpc`](../../../../core/mesh/rpc/docs/README.md) |  |
| [`@dxos/rpc-tunnel`](../../../../core/mesh/rpc-tunnel/docs/README.md) |  |
| [`@dxos/sentry`](../../../../common/sentry/docs/README.md) |  |
| [`@dxos/telemetry`](../../../../common/telemetry/docs/README.md) |  |
| [`@dxos/text-model`](../../../../core/echo/text-model/docs/README.md) |  |
| [`@dxos/timeframe`](../../../../common/timeframe/docs/README.md) |  |
| [`@dxos/util`](../../../../common/util/docs/README.md) |  |

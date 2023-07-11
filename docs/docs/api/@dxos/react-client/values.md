---
title: Values
---
# Values 

### [`AUTHENTICATION_CODE_LENGTH`]()
Type: "6"

### [`AUTH_TIMEOUT`]()
Type: "30000"

Timeout for the device to be added to the trusted set during auth.

### [`CREATE_SPACE_TIMEOUT`]()
Type: "3000"

Timeout for creating new spaces.

### [`ClientContext`](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L24)
Type: Context&lt;[ClientContextProps](/api/@dxos/react-client/types/ClientContextProps) | undefined&gt;

### [`DEFAULT_CLIENT_CHANNEL`]()
Type: "dxos:app"

### [`DEFAULT_CLIENT_ORIGIN`]()
Type: "https://halo.dxos.org/vault.html"

### [`DEFAULT_INTERNAL_CHANNEL`]()
Type: "dxos:vault"

### [`DEFAULT_SHELL_CHANNEL`]()
Type: "dxos:shell"

### [`DEFAULT_VISITORS`]()
Type: [ConvertVisitors](/api/@dxos/react-client/types/ConvertVisitors)

### [`DX_CACHE`]()
Type: string

### [`DX_CONFIG`]()
Type: string

### [`DX_DATA`]()
Type: string

### [`DX_RUNTIME`]()
Type: "/tmp/dx/run"

### [`DX_STATE`]()
Type: string

### [`ENV_DX_CONFIG`]()
Type: "DX_CONFIG"

### [`ENV_DX_PROFILE`]()
Type: "DX_PROFILE"

### [`ENV_DX_PROFILE_DEFAULT`]()
Type: "default"

### [`EXPECTED_CONFIG_VERSION`]()
Type: "1"

### [`Expando`]()
Type: ExpandoConstructor

### [`INVITATION_TIMEOUT`]()
Type: number

### [`LOAD_CONTROL_FEEDS_TIMEOUT`]()
Type: "3000"

Timeout for loading of control feeds.

### [`LOAD_PROPERTIES_TIMEOUT`]()
Type: "3000"

Timeout for space properties to be loaded in the set of tracked items.
Accounts for latency between SpaceService reporting the space as READY and DataService streaming the item states.

### [`PROXY_CONNECTION_TIMEOUT`]()
Type: "30000"

Timeout for making rpc connections from remote proxies.

### [`RESOURCE_LOCK_TIMEOUT`]()
Type: "3000"

Timeout for waiting before stealing resource lock.

### [`STATUS_TIMEOUT`]()
Type: "10000"

Timeout for how long the remote client will wait before assuming the connection is lost.

### [`TYPE_SCHEMA`]()
Type: "dxos:type/schema"

### [`TypedObject`]()
Type: TypedObjectConstructor

### [`appServiceBundle`]()
Type: ServiceBundle&lt;[AppServiceBundle](/api/@dxos/react-client/types/AppServiceBundle)&gt;

### [`base`]()
Type: unique symbol

### [`clientServiceBundle`]()
Type: ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;

Services supported by host.

### [`data`]()
Type: unique symbol

### [`db`]()
Type: unique symbol

### [`defaultConfig`]()
Type: ConfigProto

### [`iframeServiceBundle`]()
Type: ServiceBundle&lt;[IframeServiceBundle](/api/@dxos/react-client/types/IframeServiceBundle)&gt;

### [`proxy`]()
Type: unique symbol

### [`readOnly`]()
Type: unique symbol

### [`schema`]()
Type: unique symbol

### [`shellServiceBundle`]()
Type: ServiceBundle&lt;[ShellServiceBundle](/api/@dxos/react-client/types/ShellServiceBundle)&gt;

### [`workerServiceBundle`]()
Type: ServiceBundle&lt;[WorkerServiceBundle](/api/@dxos/react-client/types/WorkerServiceBundle)&gt;

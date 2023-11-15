# Class `Client`
<sub>Declared in [packages/sdk/client/src/client/client.ts:49](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L49)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L75)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>



## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L53)
Type: <code>"0.3.7"</code>

The version of this client API.

### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L115)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object.

### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L173)
Type: <code>object</code>



### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L151)
Type: <code>HaloProxy</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L132)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()` .

### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L159)
Type: <code>MeshProxy</code>

MESH networking.

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L123)
Type: <code>ClientServicesProvider</code>

Current client services provider.

### [shell](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L164)
Type: <code>Shell</code>



### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L143)
Type: <code>SpaceList</code>



### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L139)
Type: <code>MulticastObservable&lt;"null" | SystemStatus&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L99)




Returns: <code>string</code>

Arguments: none




### [addSchema(types)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L192)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`types`: <code>TypeCollection</code>


### [addTypes(types)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L184)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`types`: <code>TypeCollection</code>


### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L302)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [diagnostics(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L199)


Get client diagnostics data.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`options`: <code>JsonKeyOptions</code>


### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L216)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L329)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L320)


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L103)




Returns: <code>object</code>

Arguments: none





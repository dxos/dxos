# Class `Client`
<sub>Declared in [packages/sdk/client/src/client/client.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L66)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L110)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>



## Properties
### [reloaded](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L76)
Type: <code>Event&lt;void&gt;</code>

Emitted after the client is reset and the services have finished restarting.

### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L71)
Type: <code>"0.4.2"</code>

The version of this client API.

### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L155)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object.

### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L216)
Type: <code>object</code>



### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L191)
Type: <code>HaloProxy</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L172)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()` .

### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L199)
Type: <code>MeshProxy</code>

MESH networking.

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L163)
Type: <code>ClientServicesProvider</code>

Current client services provider.

### [shell](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L207)
Type: <code>Shell</code>



### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L183)
Type: <code>SpaceList</code>



### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L179)
Type: <code>MulticastObservable&lt;"null" | SystemStatus&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L138)




Returns: <code>string</code>

Arguments: none




### [addSchema(types)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L236)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`types`: <code>TypeCollection</code>


### [addTypes(types)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L228)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`types`: <code>TypeCollection</code>


### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L428)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [diagnostics(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L243)


Get client diagnostics data.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`options`: <code>JsonKeyOptions</code>


### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L298)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [repair()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L269)


Test and repair database.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: none




### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L463)


Resets and destroys client storage.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L454)


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L143)




Returns: <code>object</code>

Arguments: none





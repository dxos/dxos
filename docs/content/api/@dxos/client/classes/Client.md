# Class `Client`
<sub>Declared in [packages/sdk/client/src/client/client.ts:60](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L60)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L104)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>



## Properties
### [reloaded](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L70)
Type: <code>Event&lt;void&gt;</code>

Emitted after the client is reset and the services have finished restarting.

### [version](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L65)
Type: <code>"0.6.3"</code>

The version of this client API.

### [config](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L145)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object.

### [graph](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L207)
Type: <code>[Hypergraph](/api/@dxos/client/classes/Hypergraph)</code>



### [halo](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L182)
Type: <code>[Halo](/api/@dxos/client/interfaces/Halo)</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L162)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()` .

### [mesh](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L190)
Type: <code>MeshProxy</code>

MESH networking.

### [services](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L153)
Type: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Current client services provider.

### [shell](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L198)
Type: <code>[Shell](/api/@dxos/client/classes/Shell)</code>



### [spaces](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L174)
Type: <code>[Echo](/api/@dxos/client/interfaces/Echo)</code>



### [status](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L169)
Type: <code>MulticastObservable&lt;"null" | [SystemStatus](/api/@dxos/client/enums#SystemStatus)&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L128)




Returns: <code>string</code>

Arguments: none




### [addTypes(types)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L215)


Add schema types to the client.

Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`types`: <code>Schema&lt;any, any, never&gt;[]</code>


### [destroy()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L452)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [diagnostics(options)](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L236)


Get client diagnostics data.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`options`: <code>JsonKeyOptions</code>


### [initialize()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L317)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [repair()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L245)


Test and repair database.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: none




### [reset()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L489)


Resets and destroys client storage.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [resumeHostServices()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L480)


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [toJSON()](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/client/src/client/client.ts#L133)




Returns: <code>object</code>

Arguments: none





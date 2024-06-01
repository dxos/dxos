# Class `Client`
<sub>Declared in [packages/sdk/client/src/client/client.ts:61](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L61)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L105)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>



## Properties
### [reloaded](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L71)
Type: <code>Event&lt;void&gt;</code>

Emitted after the client is reset and the services have finished restarting.

### [version](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L66)
Type: <code>"0.5.4"</code>

The version of this client API.

### [config](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L146)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object.

### [experimental](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L208)
Type: <code>object</code>



### [halo](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L183)
Type: <code>[Halo](/api/@dxos/client/interfaces/Halo)</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L163)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()` .

### [mesh](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L191)
Type: <code>MeshProxy</code>

MESH networking.

### [services](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L154)
Type: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Current client services provider.

### [shell](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L199)
Type: <code>[Shell](/api/@dxos/client/classes/Shell)</code>



### [spaces](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L175)
Type: <code>[Echo](/api/@dxos/client/interfaces/Echo)</code>



### [status](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L170)
Type: <code>MulticastObservable&lt;"null" | [SystemStatus](/api/@dxos/client/enums#SystemStatus)&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L129)




Returns: <code>string</code>

Arguments: none




### [addSchema(schemaList)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L219)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`schemaList`: <code>Schema&lt;any, any, never&gt;[]</code>


### [destroy()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L460)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [diagnostics(options)](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L238)


Get client diagnostics data.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`options`: <code>JsonKeyOptions</code>


### [initialize()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L316)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [repair()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L246)


Test and repair database.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: none




### [reset()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L497)


Resets and destroys client storage.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [resumeHostServices()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L488)


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [toJSON()](https://github.com/dxos/dxos/blob/f2f84db18/packages/sdk/client/src/client/client.ts#L134)




Returns: <code>object</code>

Arguments: none





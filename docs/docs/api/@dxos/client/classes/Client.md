# Class `Client`
<sub>Declared in [packages/sdk/client/src/client/client.ts:44](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L44)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L68)




Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>



## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L48)
Type: <code>"0.2.0"</code>

The version of this client API.

### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L105)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object.

### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L141)
Type: <code>HaloProxy</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L122)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()` .

### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L149)
Type: <code>MeshProxy</code>

MESH networking.

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L113)
Type: <code>ClientServicesProvider</code>

Current client services provider.

### [shell](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L154)
Type: <code>Shell</code>



### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L133)
Type: <code>SpaceList</code>



### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L129)
Type: <code>MulticastObservable&lt;"null" | SystemStatus&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L89)




Returns: <code>string</code>

Arguments: none




### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L265)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [diagnostics(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L163)


Get client diagnostics data.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`options`: <code>JsonKeyOptions</code>


### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L180)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L292)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L283)


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L93)




Returns: <code>object</code>

Arguments: none





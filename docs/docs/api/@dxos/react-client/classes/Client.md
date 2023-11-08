# Class `Client`
<sub>Declared in [packages/sdk/client/dist/types/src/client/client.d.ts:27]()</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(\[options\])]()




Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/react-client/types/ClientOptions)</code>



## Properties
### [version]()
Type: <code>"0.3.5"</code>

The version of this client API.

### [config]()
Type: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Current configuration object.

### [experimental]()
Type: <code>object</code>



### [halo]()
Type: <code>HaloProxy</code>

HALO credentials.

### [initialized]()
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()` .

### [mesh]()
Type: <code>MeshProxy</code>

MESH networking.

### [services]()
Type: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Current client services provider.

### [shell]()
Type: <code>[Shell](/api/@dxos/react-client/classes/Shell)</code>



### [spaces]()
Type: <code>SpaceList</code>



### [status]()
Type: <code>MulticastObservable&lt;"null" | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)&gt;</code>

Client services system status.


## Methods
### [\[custom\]()]()




Returns: <code>string</code>

Arguments: none




### [addSchema(types)]()




Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: 

`types`: <code>TypeCollection</code>


### [addTypes(types)]()




Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: 

`types`: <code>TypeCollection</code>


### [destroy()]()


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [diagnostics(\[options\])]()


Get client diagnostics data.

Returns: <code>Promise&lt;any&gt;</code>

Arguments: 

`options`: <code>JsonKeyOptions</code>


### [initialize()]()


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [reset()]()


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [resumeHostServices()]()


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [toJSON()]()




Returns: <code>object</code>

Arguments: none





# Class `Client`
<sub>Declared in [packages/sdk/client/dist/types/src/client/client.d.ts:29]()</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(\[options\])]()




Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/react-client/types/ClientOptions)</code>



## Properties
### [version]()
Type: <code>"0.1.57"</code>

The version of this client API.

### [config]()
Type: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Current configuration object.

### [dbRouter]()
Type: <code>DatabaseRouter</code>



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

### [spaces]()
Type: <code>MulticastObservable&lt;Space[]&gt;</code>

ECHO spaces.

### [status]()
Type: <code>MulticastObservable&lt;"null" | [SystemStatus](/api/@dxos/react-client/enums#SystemStatus)&gt;</code>

Client services system status.


## Methods
### [\[custom\]()]()




Returns: <code>string</code>

Arguments: none




### [acceptInvitation(invitation)]()


Accept an invitation to a space.

Returns: <code>AuthenticatingInvitationObservable</code>

Arguments: 

`invitation`: <code>Invitation</code>


### [addSchema(schema)]()




Returns: <code>void</code>

Arguments: 

`schema`: <code>EchoSchema</code>


### [createSpace(\[meta\])]()


Creates a new space.

Returns: <code>Promise&lt;Space&gt;</code>

Arguments: 

`meta`: <code>PropertiesProps</code>


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


### [getSpace(\[spaceKey\])]()


Get an existing space by its key.

If no key is specified the default space is returned.

Returns: <code>undefined | Space</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>


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





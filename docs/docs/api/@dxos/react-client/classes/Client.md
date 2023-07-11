# Class `Client`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/client/client.d.ts:28]()</sub>


The Client class encapsulates the core client-side API of DXOS.


## Constructors
### [constructor(\[options\])]()



Returns: <code>[Client](/api/@dxos/react-client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/react-client/types/ClientOptions)</code>


## Properties
### [version]()
Type: <code>"0.1.51"</code>

The version of this client API

### [config]()
Type: <code>[Config](/api/@dxos/react-client/classes/Config)</code>

Current configuration object

### [dbRouter]()
Type: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

### [halo]()
Type: <code>[HaloProxy](/api/@dxos/react-client/classes/HaloProxy)</code>

HALO credentials.

### [initialized]()
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`

### [mesh]()
Type: <code>[MeshProxy](/api/@dxos/react-client/classes/MeshProxy)</code>

MESH networking.

### [monitor]()
Type: <code>[Monitor](/api/@dxos/react-client/classes/Monitor)</code>

Debug monitor.

### [services]()
Type: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

Current client services provider.

### [spaces]()
Type: <code>MulticastObservable&lt;[Space](/api/@dxos/react-client/interfaces/Space)[]&gt;</code>

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


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/react-client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/react-client/interfaces/Invitation)</code>

### [addSchema(schema)]()



Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/react-client/classes/EchoSchema)</code>

### [createSerializer()]()



Returns: <code>[SpaceSerializer](/api/@dxos/react-client/classes/SpaceSerializer)</code>

Arguments: none

### [createSpace(\[meta\])]()



Creates a new space.


Returns: <code>Promise&lt;[Space](/api/@dxos/react-client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/react-client/types/PropertiesProps)</code>

### [destroy()]()



Cleanup, release resources.
Open/close is re-entrant.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [getSpace(spaceKey)]()



Get an existing space by its key.


Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

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

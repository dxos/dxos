# Class `Client`
<sub>Declared in [packages/sdk/client/src/packlets/client/client.ts:53](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L53)</sub>


The Client class encapsulates the core client-side API of DXOS.


## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L80)



Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>


## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L57)
Type: <code>"0.1.51"</code>

The version of this client API

### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L131)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object

### [dbRouter](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L181)
Type: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L160)
Type: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L146)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`

### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L167)
Type: <code>[MeshProxy](/api/@dxos/client/classes/MeshProxy)</code>

MESH networking.

### [monitor](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L174)
Type: <code>[Monitor](/api/@dxos/client/classes/Monitor)</code>

Debug monitor.

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L138)
Type: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Current client services provider.

### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L192)
Type: <code>MulticastObservable&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>

ECHO spaces.

### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L153)
Type: <code>MulticastObservable&lt;"null" | [SystemStatus](/api/@dxos/client/enums#SystemStatus)&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L115)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L213)



Accept an invitation to a space.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [addSchema(schema)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L185)



Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/client/classes/EchoSchema)</code>

### [createSerializer()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L324)



Returns: <code>[SpaceSerializer](/api/@dxos/client/classes/SpaceSerializer)</code>

Arguments: none

### [createSpace(\[meta\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L206)



Creates a new space.


Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/client/types/PropertiesProps)</code>

### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L278)



Cleanup, release resources.
Open/close is re-entrant.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [getSpace(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L199)



Get an existing space by its key.


Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L222)



Initializes internal resources in an idempotent way.
Required before using the Client instance.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L309)



Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L300)



Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L119)



Returns: <code>object</code>

Arguments: none

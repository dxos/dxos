# Class `Client`
<sub>Declared in [packages/sdk/client/src/packlets/client/client.ts:51](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L51)</sub>


The Client class encapsulates the core client-side API of DXOS.


## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L77)



Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>


## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L55)
Type: <code>"0.1.49"</code>

The version of this client API

### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L127)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object

### [dbRouter](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L170)
Type: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L156)
Type: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L142)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`

### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L163)
Type: <code>[MeshProxy](/api/@dxos/client/classes/MeshProxy)</code>

MESH networking.

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L134)
Type: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Current client services provider.

### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L181)
Type: <code>MulticastObservable&lt;[Space](/api/@dxos/client/interfaces/Space)[]&gt;</code>

ECHO spaces.

### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L149)
Type: <code>MulticastObservable&lt;"null" | [SystemStatus](/api/@dxos/client/enums#SystemStatus)&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L111)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L202)



Accept an invitation to a space.


Returns: <code>[AuthenticatingInvitationObservable](/api/@dxos/client/classes/AuthenticatingInvitationObservable)</code>

Arguments: 

`invitation`: <code>[Invitation](/api/@dxos/client/interfaces/Invitation)</code>

### [addSchema(schema)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L174)



Returns: <code>void</code>

Arguments: 

`schema`: <code>[EchoSchema](/api/@dxos/client/classes/EchoSchema)</code>

### [createSerializer()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L311)



Returns: <code>[SpaceSerializer](/api/@dxos/client/classes/SpaceSerializer)</code>

Arguments: none

### [createSpace(\[meta\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L195)



Creates a new space.


Returns: <code>Promise&lt;[Space](/api/@dxos/client/interfaces/Space)&gt;</code>

Arguments: 

`meta`: <code>[PropertiesProps](/api/@dxos/client/types/PropertiesProps)</code>

### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L266)



Cleanup, release resources.
Open/close is re-entrant.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [getSpace(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L188)



Get an existing space by its key.


Returns: <code>undefined | [Space](/api/@dxos/client/interfaces/Space)</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L211)



Initializes internal resources in an idempotent way.
Required before using the Client instance.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L296)



Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L287)



Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L115)



Returns: <code>object</code>

Arguments: none

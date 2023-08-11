# Class `Client`
<sub>Declared in [packages/sdk/client/src/client/client.ts:52](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L52)</sub>


The Client class encapsulates the core client-side API of DXOS.


## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L74)



Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>


## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L56)
Type: <code>"0.1.55"</code>

The version of this client API

### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L111)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object

### [dbRouter](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L171)
Type: <code>DatabaseRouter</code>

### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L147)
Type: <code>HaloProxy</code>

HALO credentials.

### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L128)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`

### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L155)
Type: <code>MeshProxy</code>

MESH networking.

### [monitor](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L163)
Type: <code>Monitor</code>

Debug monitor.

### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L119)
Type: <code>ClientServicesProvider</code>

Current client services provider.

### [spaces](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L182)
Type: <code>MulticastObservable&lt;Space[]&gt;</code>

ECHO spaces.

### [status](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L135)
Type: <code>MulticastObservable&lt;"null" | SystemStatus&gt;</code>

Client services system status.


## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L95)



Returns: <code>string</code>

Arguments: none

### [acceptInvitation(invitation)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L203)



Accept an invitation to a space.


Returns: <code>AuthenticatingInvitationObservable</code>

Arguments: 

`invitation`: <code>Invitation</code>

### [addSchema(schema)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L175)



Returns: <code>void</code>

Arguments: 

`schema`: <code>EchoSchema</code>

### [createSpace(\[meta\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L196)



Creates a new space.


Returns: <code>Promise&lt;Space&gt;</code>

Arguments: 

`meta`: <code>PropertiesProps</code>

### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L288)



Cleanup, release resources.
Open/close is re-entrant.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [diagnostics(opts)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L210)



Get client diagnostics data.


Returns: <code>Promise&lt;Diagnostics&gt;</code>

Arguments: 

`opts`: <code>JsonStringifyOptions</code>

### [getSpace(spaceKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L189)



Get an existing space by its key.


Returns: <code>undefined | Space</code>

Arguments: 

`spaceKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L220)



Initializes internal resources in an idempotent way.
Required before using the Client instance.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L316)



Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L307)



Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/client/client.ts#L99)



Returns: <code>object</code>

Arguments: none

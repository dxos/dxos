# Class `Client`
<sub>Declared in [packages/sdk/client/src/packlets/client/client.ts:41](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L41)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L60)


Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>

## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L45)
Type: <code>"0.1.27"</code>

The version of this client API
### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L99)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object
### [echo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L129)
Type: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

ECHO database.
### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L121)
Type: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

HALO credentials.
### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L114)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`
### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L138)
Type: <code>[MeshProxy](/api/@dxos/client/classes/MeshProxy)</code>
### [services](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L106)
Type: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

Current client services provider.

## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L83)


Returns: <code>string</code>

Arguments: none
### [createSerializer()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L255)


Returns: <code>[SpaceSerializer](/api/@dxos/client/classes/SpaceSerializer)</code>

Arguments: none
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L203)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L218)


Returns: <code>undefined | [SystemStatus](/api/@dxos/client/enums#SystemStatus)</code>

Arguments: none
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L148)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L243)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [resumeHostServices()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L234)


Reinitialized the client session with the remote service host.
This is useful when connecting to a host running behind a resource lock
(e.g., HALO when SharedWorker is unavailable).

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [subscribeStatus(callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L225)


Observe the system status.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`callback`: <code>function</code>
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L87)


Returns: <code>object</code>

Arguments: none
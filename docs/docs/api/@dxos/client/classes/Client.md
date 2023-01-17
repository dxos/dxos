# Class `Client`
<sub>Declared in [packages/sdk/client/src/packlets/client/client.ts:40](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L40)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L56)


Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>

## Properties
### [version](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L44)
Type: <code>"0.1.23"</code>

The version of this client API
### [config](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L95)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object
### [echo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L118)
Type: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

ECHO database.
### [halo](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L110)
Type: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

HALO credentials.
### [initialized](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L103)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`
### [mesh](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L123)
Type: <code>[MeshProxy](/api/@dxos/client/classes/MeshProxy)</code>

## Methods
### [\[custom\]()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L79)


Returns: <code>string</code>

Arguments: none
### [createSerializer()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L195)


Returns: <code>[SpaceSerializer](/api/@dxos/client/classes/SpaceSerializer)</code>

Arguments: none
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L159)


Cleanup, release resources.
Open/close is re-entrant.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getStatus()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L176)


Get system status.

Returns: <code>Promise&lt;Status&gt;</code>

Arguments: none
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L133)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [reset()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L184)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [toJSON()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/client/client.ts#L83)


Returns: <code>object</code>

Arguments: none
# Class `Client`
<sub>Declared in [packages/sdk/client/src/packlets/client/client.ts:37](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L37)</sub>


The Client class encapsulates the core client-side API of DXOS.

## Constructors
### [constructor(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L52)


Returns: <code>[Client](/api/@dxos/client/classes/Client)</code>

Arguments: 

`options`: <code>[ClientOptions](/api/@dxos/client/types/ClientOptions)</code>

## Properties
### [version](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L41)
Type: <code>"0.1.7"</code>

The version of this client API
### [config](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L87)
Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

Current configuration object
### [echo](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L110)
Type: <code>[EchoProxy](/api/@dxos/client/classes/EchoProxy)</code>

ECHO database.
### [halo](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L102)
Type: <code>[HaloProxy](/api/@dxos/client/classes/HaloProxy)</code>

HALO credentials.
### [initialized](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L95)
Type: <code>boolean</code>

Returns true if the client has been initialized. Initialize by calling  `.initialize()`

## Methods
### [\[custom\]()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L72)


Returns: <code>string</code>

Arguments: none
### [destroy()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L147)


Cleanup, release resources.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [initialize()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L121)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [reset()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L166)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [toJSON()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L76)


Returns: <code>object</code>

Arguments: none
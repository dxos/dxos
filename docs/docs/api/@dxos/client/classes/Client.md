# Class `Client`
Declared in [`packages/sdk/client/src/packlets/client/client.ts:31`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L31)


The Client class encapsulates DXOS's core client-side API.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L43)


Returns: [`Client`](/api/@dxos/client/classes/Client)

Arguments: 

`__namedParameters`: [`ClientOptions`](/api/@dxos/client/types/ClientOptions)

## Properties
### [`version`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L32)
Type: `"0.1.2"`
### [`config`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L75)
Type: `Config`
### [`echo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L99)
Type: [`EchoProxy`](/api/@dxos/client/classes/EchoProxy)

ECHO database.
### [`halo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L91)
Type: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

HALO credentials.
### [`initialized`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L84)
Type: `boolean`

Has the Client been initialized?
Initialize by calling  `.initialize()`

## Methods
### [`[custom]`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L63)


Returns: `string`

Arguments: none
### [`destroy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L134)


Cleanup, release resources.

Returns: `Promise<void>`

Arguments: none
### [`initialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L110)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: `Promise<void>`

Arguments: none
### [`reset`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L153)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: `Promise<void>`

Arguments: none
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L67)


Returns: `object`

Arguments: none
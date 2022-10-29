# Class `Client`
Declared in [`packages/sdk/client/src/packlets/proxies/client.ts:78`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L78)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L100)


Creates the client object based on supplied configuration.
Requires initialization after creating by calling  `.initialize()` .

Returns: [`Client`](/api/@dxos/client/classes/Client)

Arguments: 

`config`: `Config | Config`

`options`: [`ClientOptions`](/api/@dxos/client/interfaces/ClientOptions)

## Properties
### [`version`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L79)
Type: `"2.33.8"`
### [`config`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L132)
Type: `Config`
### [`echo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L147)
Type: [`EchoProxy`](/api/@dxos/client/classes/EchoProxy)

ECHO database.
### [`halo`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L155)
Type: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

HALO credentials.
### [`info`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L124)
Type: [`ClientInfo`](/api/@dxos/client/interfaces/ClientInfo)
### [`initialized`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L140)
Type: `boolean`

Has the Client been initialized?
Initialize by calling  `.initialize()`
### [`services`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L166)
Type: `ClientServices`

Client services that can be proxied.

## Methods
### [`destroy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L265)


Cleanup, release resources.

Returns: `Promise<void>`

Arguments: none
### [`initialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L179)


Initializes internal resources in an idempotent way.
Required before using the Client instance.

Returns: `Promise<void>`

Arguments: 

`onProgressCallback`: `function`
### [`registerModel`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L295)


Registers a new ECHO model.

Returns: [`Client`](/api/@dxos/client/classes/Client)

Arguments: 

`constructor`: `ModelConstructor<any>`
### [`reset`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L284)


Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.

Returns: `Promise<void>`

Arguments: none
### [`toString`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L120)


Returns: `string`

Arguments: none
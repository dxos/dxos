# Class `Client`
> Declared in [`packages/sdk/client/src/packlets/proxies/client.ts:78`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L78)




## Constructors
```ts
new Client (config: Config | Config, options: ClientOptions) => Client
```
Creates the client object based on supplied configuration.
Requires initialization after creating by calling  `.initialize()` .

## Properties
### `version: "2.33.8"`
### `config:  get Config`
### `echo:  get EchoProxy`
ECHO database.
### `halo:  get HaloProxy`
HALO credentials.
### `info:  get ClientInfo`
### `initialized:  get boolean`
Has the Client been initialized?
Initialize by calling  `.initialize()`
### `services:  get ClientServices`
Client services that can be proxied.

## Functions
```ts
destroy () => Promise<void>
```
Cleanup, release resources.
```ts
initialize (onProgressCallback: function) => Promise<void>
```
Initializes internal resources in an idempotent way.
Required before using the Client instance.
```ts
registerModel (constructor: ModelConstructor<any>) => Client
```
Registers a new ECHO model.
```ts
reset () => Promise<void>
```
Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.
```ts
toString () => string
```
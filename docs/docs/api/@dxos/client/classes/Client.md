# Class `Client`
> Declared in [`packages/sdk/client/src/packlets/proxies/client.ts:78`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/client.ts#L78)




## Constructors
### constructor
```ts
(config: Config | Config, options: ClientOptions) => Client
```
Creates the client object based on supplied configuration.
Requires initialization after creating by calling  `.initialize()` .

## Properties
### version 
> Type: `"2.33.8"`
<br/>
### config
> Type: `Config`
<br/>
### echo
> Type: `EchoProxy`
<br/>

ECHO database.
### halo
> Type: `HaloProxy`
<br/>

HALO credentials.
### info
> Type: `ClientInfo`
<br/>
### initialized
> Type: `boolean`
<br/>

Has the Client been initialized?
Initialize by calling  `.initialize()`
### services
> Type: `ClientServices`
<br/>

Client services that can be proxied.

## Methods
### destroy
```ts
() => Promise<void>
```
Cleanup, release resources.
### initialize
```ts
(onProgressCallback: function) => Promise<void>
```
Initializes internal resources in an idempotent way.
Required before using the Client instance.
### registerModel
```ts
(constructor: ModelConstructor<any>) => Client
```
Registers a new ECHO model.
### reset
```ts
() => Promise<void>
```
Resets and destroys client storage.
Warning: Inconsistent state after reset, do not continue to use this client instance.
### toString
```ts
() => string
```
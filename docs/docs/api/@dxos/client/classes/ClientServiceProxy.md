# Class `ClientServiceProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/service-proxy.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L13)


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
```ts
new ClientServiceProxy (port: RpcPort, _timeout: number) => ClientServiceProxy
```

## Properties
### `services: ClientServices`

## Functions
```ts
close () => Promise<void>
```
```ts
open (onProgressCallback: function) => Promise<void>
```
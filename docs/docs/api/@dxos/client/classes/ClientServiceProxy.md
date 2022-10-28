# Class `ClientServiceProxy`
> Declared in [`packages/sdk/client/src/packlets/proxies/service-proxy.ts:13`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/service-proxy.ts#L13)


Implements services that are not local to the app.
For example, the services can be located in Wallet Extension.

## Constructors
### constructor
```ts
(port: RpcPort, _timeout: number) => [ClientServiceProxy](/api/@dxos/client/classes/ClientServiceProxy)
```

## Properties
### services 
Type: ClientServices

## Methods
### close
```ts
() => Promise&lt;void&gt;
```
### open
```ts
(onProgressCallback: function) => Promise&lt;void&gt;
```
# Class `WorkerRuntime`
Declared in [`packages/sdk/client-services/src/packlets/vault/worker-runtime.ts:26`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L26)


Runtime for the shared worker.
Manages connections from proxies (in tabs).
Tabs make requests to the  `ClientServicesHost` , and provide a WebRTC gateway.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L35)


Returns: [`WorkerRuntime`](/api/@dxos/client-services/classes/WorkerRuntime)

Arguments: 

`_configProvider`: `function`

## Properties


## Methods
### [`createSession`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L65)


Create a new session.

Returns: `Promise<void>`

Arguments: 

`__namedParameters`: [`CreateSessionParams`](/api/@dxos/client-services/types/CreateSessionParams)
### [`start`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L39)


Returns: `Promise<void>`

Arguments: none
### [`stop`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L57)


Returns: `Promise<void>`

Arguments: none
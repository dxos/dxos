# Class `WorkerRuntime`
Declared in [`packages/sdk/client-services/dist/src/packlets/vault/worker-runtime.d.ts:12`]()


Runtime for the shared worker.
Manages connections from proxies (in tabs).
Tabs make requests to the  `ClientServicesHost` , and provide a WebRTC gateway.

## Constructors
### [`constructor`]()


Returns: [`WorkerRuntime`](/api/@dxos/client/classes/WorkerRuntime)

Arguments: 

`_configProvider`: `function`

## Properties


## Methods
### [`createSession`]()


Create a new session.

Returns: `Promise<void>`

Arguments: 

`__namedParameters`: `CreateSessionParams`
### [`start`]()


Returns: `Promise<void>`

Arguments: none
### [`stop`]()


Returns: `Promise<void>`

Arguments: none
# Class `WorkerRuntime`
<sub>Declared in [packages/sdk/client-services/src/packlets/vault/worker-runtime.ts:26](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L26)</sub>


Runtime for the shared worker.
Manages connections from proxies (in tabs).
Tabs make requests to the  `ClientServicesHost` , and provide a WebRTC gateway.

## Constructors
### [constructor(_configProvider)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L35)


Returns: <code>[WorkerRuntime](/api/@dxos/client-services/classes/WorkerRuntime)</code>

Arguments: 

`_configProvider`: <code>function</code>

## Properties

## Methods
### [createSession(options)](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L69)


Create a new session.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`options`: <code>[CreateSessionParams](/api/@dxos/client-services/types/CreateSessionParams)</code>
### [start()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L39)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [stop()](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/vault/worker-runtime.ts#L61)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
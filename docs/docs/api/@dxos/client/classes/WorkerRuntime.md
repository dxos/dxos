# Class `WorkerRuntime`
<sub>Declared in [packages/sdk/client-services/dist/src/packlets/vault/worker-runtime.d.ts:13]()</sub>


Runtime for the shared worker.
Manages connections from proxies (in tabs).
Tabs make requests to the  `ClientServicesHost` , and provide a WebRTC gateway.

## Constructors
### [constructor(_configProvider)]()


Returns: <code>[WorkerRuntime](/api/@dxos/client/classes/WorkerRuntime)</code>

Arguments: 

`_configProvider`: <code>function</code>

## Properties

## Methods
### [createSession(options)]()


Create a new session.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`options`: <code>CreateSessionParams</code>
### [start()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [stop()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
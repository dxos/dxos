# Class `IFrameHostRuntime`
<sub>Declared in [packages/sdk/client-services/dist/types/src/packlets/vault/iframe-host-runtime.d.ts:14]()</sub>


Runs the client services in the main thread.

Holds a lock over the client services such that only one instance can run at a time.
This should only be used when SharedWorker is not available.

## Constructors
### [constructor(options)]()


Returns: <code>[IFrameHostRuntime](/api/@dxos/client/classes/IFrameHostRuntime)</code>

Arguments: 

`options`: <code>IFrameHostRuntimeParams</code>

## Properties
### [origin]()
Type: <code>string</code>

## Methods
### [start()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [stop()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
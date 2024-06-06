# Class `WorkerClientServices`
<sub>Declared in [packages/sdk/client/src/services/worker-client-services.ts:39](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L39)</sub>


Proxy to host client service in worker.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L56)




Returns: <code>[WorkerClientServices](/api/@dxos/client/classes/WorkerClientServices)</code>

Arguments: 

`options`: <code>WorkerClientServicesParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L40)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [joinedSpace](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L41)
Type: <code>Event&lt;[PublicKey](/api/@dxos/client/classes/PublicKey)&gt;</code>



### [descriptors](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L70)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [runtime](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L78)
Type: <code>SharedWorkerConnection</code>



### [services](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L74)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L149)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/4d6eae504/packages/sdk/client/src/services/worker-client-services.ts#L83)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none





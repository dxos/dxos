# Class `WorkerClientServices`
<sub>Declared in [packages/sdk/client/src/services/worker-client-services.ts:36](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L36)</sub>


Proxy to host client service in worker.

## Constructors
### [constructor(options)](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L51)




Returns: <code>[WorkerClientServices](/api/@dxos/client/classes/WorkerClientServices)</code>

Arguments: 

`options`: <code>WorkerClientServicesParams</code>



## Properties
### [closed](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L37)
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was termintaed.

This should fire if the services disconnect unexpectedly or during a client reset.

### [joinedSpace](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L38)
Type: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>



### [descriptors](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L57)
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>



### [runtime](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L65)
Type: <code>SharedWorkerConnection</code>



### [services](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L61)
Type: <code>Partial&lt;[ClientServices](/api/@dxos/client/types/ClientServices)&gt;</code>




## Methods
### [close()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L129)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()](https://github.com/dxos/dxos/blob/235256b25/packages/sdk/client/src/services/worker-client-services.ts#L70)




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none





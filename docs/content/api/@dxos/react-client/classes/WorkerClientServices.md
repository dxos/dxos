# Class `WorkerClientServices`
<sub>Declared in [packages/sdk/client/dist/types/src/services/worker-client-services.d.ts:21]()</sub>


Proxy to host client service in worker.

## Constructors
### [constructor(options)]()




Returns: <code>[WorkerClientServices](/api/@dxos/react-client/classes/WorkerClientServices)</code>

Arguments: 

`options`: <code>WorkerClientServicesParams</code>



## Properties
### [closed]()
Type: <code>Event&lt;undefined | Error&gt;</code>

The connection to the services provider was terminated.
This should fire if the services disconnect unexpectedly or during a client reset.

### [joinedSpace]()
Type: <code>Event&lt;[PublicKey](/api/@dxos/react-client/classes/PublicKey)&gt;</code>



### [descriptors]()
Type: <code>ServiceBundle&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>



### [runtime]()
Type: <code>SharedWorkerConnection</code>



### [services]()
Type: <code>Partial&lt;[ClientServices](/api/@dxos/react-client/types/ClientServices)&gt;</code>




## Methods
### [close()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [open()]()




Returns: <code>Promise&lt;void&gt;</code>

Arguments: none





# Class `Monitor`
<sub>Declared in [packages/sdk/client/src/packlets/diagnostics/monitor.ts:15](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/diagnostics/monitor.ts#L15)</sub>


Activity monitor.


## Constructors
### [constructor(_serviceProvider)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/diagnostics/monitor.ts#L25)



Returns: <code>[Monitor](/api/@dxos/client/classes/Monitor)</code>

Arguments: 

`_serviceProvider`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>


## Properties


## Methods
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/diagnostics/monitor.ts#L56)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [getPipelineStats(bucketSize)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/diagnostics/monitor.ts#L60)



Returns: <code>Record&lt;string, TimeBucket[]&gt;</code>

Arguments: 

`bucketSize`: <code>number</code>

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/diagnostics/monitor.ts#L29)



Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

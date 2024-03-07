# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/src/echo/space-proxy.ts:42](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L42)</sub>




## Constructors
### [constructor(_clientServices, _modelFactory, _data, graph, automergeContext)](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L93)




Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_data`: <code>Space</code>

`graph`: <code>Hypergraph</code>

`automergeContext`: <code>AutomergeContext</code>



## Properties
### [db](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L153)
Type: <code>[EchoDatabase](/api/@dxos/client/interfaces/EchoDatabase)</code>

Echo database.

### [error](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L205)
Type: <code>undefined | Error</code>



### [internal](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L201)
Type: <code>SpaceInternal</code>



### [invitations](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L186)
Type: <code>MulticastObservable&lt;[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>



### [isOpen](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L158)
Type: <code>boolean</code>



### [key](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L149)
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>



### [members](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L193)
Type: <code>MulticastObservable&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)[]&gt;</code>



### [pipeline](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L179)
Type: <code>MulticastObservable&lt;PipelineState&gt;</code>

Current state of space pipeline.

### [properties](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L163)
Type: <code>[TypedObject](/api/@dxos/client/types/TypedObject)</code>

Properties object.

### [state](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L172)
Type: <code>MulticastObservable&lt;[SpaceState](/api/@dxos/client/enums#SpaceState)&gt;</code>

Current state of the space.
The database is ready to be used in  `SpaceState.READY`  state.
Presence is available in  `SpaceState.CONTROL_ONLY`  state.


## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L414)




Returns: <code>Promise&lt;never&gt;</code>

Arguments: 

`open`: <code>boolean</code>


### [close()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L364)


TODO

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [createSnapshot()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L409)


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none




### [listen(channel, callback)](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L391)


Listen for messages posted to the space.

Returns: <code>function</code>

Arguments: 

`channel`: <code>string</code>

`callback`: <code>function</code>


### [open()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L357)


TODO

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none




### [postMessage(channel, message)](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L379)


Post a message to the space.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`channel`: <code>string</code>

`message`: <code>any</code>


### [share(\[options\])](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L401)


Creates an interactive invitation.

Returns: <code>[CancellableInvitation](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>


### [waitUntilReady()](https://github.com/dxos/dxos/blob/bfdd5a17b/packages/sdk/client/src/echo/space-proxy.ts#L371)


Waits until the space is in the ready state, with database initialized.

Returns: <code>Promise&lt;[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)&gt;</code>

Arguments: none





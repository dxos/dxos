# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:26](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L26)</sub>





## Constructors
### [constructor(_clientServices, _modelFactory, _data, databaseRouter)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L76)



Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_data`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>


## Properties
### [db](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L126)
Type: <code>[EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>

Echo database.

### [error](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L172)
Type: <code>undefined | Error</code>

### [internal](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L168)
Type: <code>[SpaceInternal](/api/@dxos/client/interfaces/SpaceInternal)</code>

### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L153)
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)[]&gt;</code>

### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L122)
Type: <code>boolean</code>

### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L118)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [members](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L160)
Type: <code>MulticastObservable&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)[]&gt;</code>

### [pipeline](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L146)
Type: <code>MulticastObservable&lt;PipelineState&gt;</code>

Current state of space pipeline.

### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L130)
Type: <code>[Properties](/api/@dxos/client/classes/Properties) | [TypedObject](/api/@dxos/client/values#TypedObject)</code>

Properties object.

### [state](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L139)
Type: <code>MulticastObservable&lt;[SpaceState](/api/@dxos/client/enums#SpaceState)&gt;</code>

Current state of the space.
The database is ready to be used in  `SpaceState.READY`  state.
Presence is available in  `SpaceState.INACTIVE`  state.


## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L344)



Returns: <code>Promise&lt;never&gt;</code>

Arguments: 

`open`: <code>boolean</code>

### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L294)



TODO


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L331)



Creates an interactive invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/classes/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>Partial&lt;[Invitation](/api/@dxos/client/interfaces/Invitation)&gt;</code>

### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L339)



Implementation method.


Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none

### [listen(channel, callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L321)



Listen for messages posted to the space.


Returns: <code>function</code>

Arguments: 

`channel`: <code>string</code>

`callback`: <code>function</code>

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L287)



TODO


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [postMessage(channel, message)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L309)



Post a message to the space.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`channel`: <code>string</code>

`message`: <code>any</code>

### [waitUntilReady()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L301)



Waits until the space is in the ready state, with database initialized.


Returns: <code>Promise&lt;[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)&gt;</code>

Arguments: none

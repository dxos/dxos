# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:81](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L81)</sub>





## Constructors
### [constructor(_clientServices, _modelFactory, _data, databaseRouter)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L135)



Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_data`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>


## Properties
### [db](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L177)
Type: <code>[EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>

Echo database.

### [internal](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L219)
Type: <code>Internal</code>

### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L204)
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]&gt;</code>

### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L160)
Type: <code>boolean</code>

### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L156)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

### [members](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L211)
Type: <code>MulticastObservable&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)[]&gt;</code>

### [pipeline](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L197)
Type: <code>MulticastObservable&lt;PipelineState&gt;</code>

Current state of space pipeline.

### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L181)
Type: <code>[TypedObject](/api/@dxos/client/values#TypedObject)&lt;object&gt;</code>

Properties object.

### [state](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L190)
Type: <code>MulticastObservable&lt;[SpaceState](/api/@dxos/client/enums#SpaceState)&gt;</code>

Current state of the space.
The database is ready to be used in  `SpaceState.READY`  state.
Presence is available in  `SpaceState.INACTIVE`  state.


## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L401)



Returns: <code>Promise&lt;never&gt;</code>

Arguments: 

`open`: <code>boolean</code>

### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L322)



TODO


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L359)



Creates an interactive invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>[InvitationsOptions](/api/@dxos/client/types/InvitationsOptions)</code>

### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L396)



Implementation method.


Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none

### [listen(channel, callback)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L349)



Listen for messages posted to the space.


Returns: <code>function</code>

Arguments: 

`channel`: <code>string</code>

`callback`: <code>function</code>

### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L315)



TODO


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [postMessage(channel, message)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L337)



Post a message to the space.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`channel`: <code>string</code>

`message`: <code>any</code>

### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L385)



Remove invitation from space.


Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>

### [waitUntilReady()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L329)



Waits until the space is in the ready state, with database initialized.


Returns: <code>Promise&lt;[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)&gt;</code>

Arguments: none

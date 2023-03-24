# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/space-proxy.d.ts:45]()</sub>





## Constructors
### [constructor(_clientServices, _modelFactory, _data, databaseRouter)]()



Returns: <code>[SpaceProxy](/api/@dxos/react-client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_data`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>


## Properties
### [db]()
Type: <code>[EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>

Current state of the space.
The database is ready to be used in  `SpaceState.READY`  state.
Presence is available in  `SpaceState.INACTIVE`  state.

### [internal]()
Type: <code>Internal</code>

### [invitations]()
Type: <code>MulticastObservable&lt;[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]&gt;</code>

### [isOpen]()
Type: <code>boolean</code>

### [key]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

### [members]()
Type: <code>MulticastObservable&lt;[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)[]&gt;</code>

### [properties]()
Type: <code>[TypedObject](/api/@dxos/react-client/values#TypedObject)&lt;object&gt;</code>

### [state]()
Type: <code>MulticastObservable&lt;[SpaceState](/api/@dxos/react-client/enums#SpaceState)&gt;</code>

Current state of the space.
The database is ready to be used in  `SpaceState.READY`  state.
Presence is available in  `SpaceState.INACTIVE`  state.


## Methods
### [_setOpen(open)]()



Returns: <code>Promise&lt;never&gt;</code>

Arguments: 

`open`: <code>boolean</code>

### [close()]()



TODO


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [createInvitation(\[options\])]()



Creates an interactive invitation.


Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>[InvitationsOptions](/api/@dxos/react-client/types/InvitationsOptions)</code>

### [createSnapshot()]()



Implementation method.


Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none

### [listen(channel, callback)]()



Listen for messages posted to the space.


Returns: <code>function</code>

Arguments: 

`channel`: <code>string</code>

`callback`: <code>function</code>

### [open()]()



TODO


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none

### [postMessage(channel, message)]()



Post a message to the space.


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`channel`: <code>string</code>

`message`: <code>any</code>

### [removeInvitation(id)]()



Remove invitation from space.


Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>

### [waitUntilReady()]()



Waits until the space is in the ready state, with database initialized.


Returns: <code>Promise&lt;[SpaceProxy](/api/@dxos/react-client/classes/SpaceProxy)&gt;</code>

Arguments: none

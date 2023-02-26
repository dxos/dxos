# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/space-proxy.d.ts:27]()</sub>




## Constructors
### [constructor(_clientServices, _modelFactory, _state, databaseRouter)]()


Returns: <code>[SpaceProxy](/api/@dxos/react-client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_state`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

## Properties
### [invitationsUpdate]()
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)&gt;</code>
### [stateUpdate]()
Type: <code>Event&lt;void&gt;</code>
### [db]()
Type: <code>[EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>
### [internal]()
Type: <code>Internal</code>
### [invitations]()
Type: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>
### [isOpen]()
Type: <code>boolean</code>
### [key]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
### [properties]()
Type: <code>[Document](/api/@dxos/react-client/values#Document)&lt;object&gt;</code>

## Methods
### [_setOpen(open)]()


Returns: <code>Promise&lt;never&gt;</code>

Arguments: 

`open`: <code>boolean</code>
### [close()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])]()


Creates an interactive invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createSnapshot()]()


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none
### [destroy()]()


Called by EchoProxy close.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getMembers()]()


Return set of space members.

Returns: <code>[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)[]</code>

Arguments: none
### [initialize()]()


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [removeInvitation(id)]()


Remove invitation from space.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [subscribeMembers(callback)]()


Subscribe to changes to space members.

Returns: <code>UnsubscribeCallback</code>

Arguments: 

`callback`: <code>function</code>
# Class `SpaceProxy`
<<<<<<< HEAD
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/space-proxy.d.ts:36]()</sub>
=======
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/space-proxy.d.ts:62]()</sub>
>>>>>>> ac192b194 (tunneling)




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
<<<<<<< HEAD
### [db]()
Type: <code>[EchoDatabase](/api/@dxos/react-client/classes/EchoDatabase)</code>
=======
### [experimental]()
Type: <code>Experimental</code>

Next-gen database.
>>>>>>> ac192b194 (tunneling)
### [internal]()
Type: <code>Internal</code>
### [invitations]()
Type: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive]()
Type: <code>boolean</code>
### [isOpen]()
Type: <code>boolean</code>
### [key]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
### [properties]()
<<<<<<< HEAD
Type: <code>[Document](/api/@dxos/react-client/classes/Document)</code>
=======
Type: <code>ObjectProperties</code>
>>>>>>> ac192b194 (tunneling)

## Methods
### [_setOpen(open)]()


Returns: <code>Promise&lt;void&gt;</code>

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
### [getDetails()]()


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: none
### [initialize()]()


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [queryMembers()]()


Return set of space members.

Returns: <code>[ResultSet](/api/@dxos/react-client/classes/ResultSet)&lt;[SpaceMember](/api/@dxos/react-client/interfaces/SpaceMember)&gt;</code>

Arguments: none
### [removeInvitation(id)]()


Remove invitation from space.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [setActive(active)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`active`: <code>boolean</code>
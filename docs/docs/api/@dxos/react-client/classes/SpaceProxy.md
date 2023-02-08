# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/dist/types/src/packlets/proxies/space-proxy.d.ts:61]()</sub>




## Constructors
### [constructor(_clientServices, _modelFactory, _state, databaseRouter, memberKey)]()


Returns: <code>[SpaceProxy](/api/@dxos/react-client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/react-client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_state`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/react-client/classes/DatabaseRouter)</code>

`memberKey`: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>

## Properties
### [invitationsUpdate]()
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)&gt;</code>
### [stateUpdate]()
Type: <code>Event&lt;void&gt;</code>
### [database]()
Type: <code>[Database](/api/@dxos/react-client/classes/Database)</code>
### [experimental]()
Type: <code>Experimental</code>

Next-gen database.
### [invitations]()
Type: <code>[CancellableInvitationObservable](/api/@dxos/react-client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive]()
Type: <code>boolean</code>
### [isOpen]()
Type: <code>boolean</code>
### [key]()
Type: <code>[PublicKey](/api/@dxos/react-client/classes/PublicKey)</code>
### [properties]()
Type: <code>ObjectProperties</code>
### [reduce]()
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.
### [select]()
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.

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
### [getProperty(key, \[defaultValue\])]()


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>any</code>
### [getTitle()]()


Returns: <code>never</code>

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
### [setProperty(key, \[value\])]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [setTitle(title)]()


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`title`: <code>string</code>
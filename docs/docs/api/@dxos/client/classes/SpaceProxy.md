# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:66](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L66)</sub>




## Constructors
### [constructor(_clientServices, _modelFactory, _state, databaseRouter)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L87)


Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_state`: <code>Space</code>

`databaseRouter`: <code>[DatabaseRouter](/api/@dxos/client/classes/DatabaseRouter)</code>

## Properties
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L67)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [stateUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L68)
Type: <code>Event&lt;void&gt;</code>
<<<<<<< HEAD
### [db](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L126)
Type: <code>[EchoDatabase](/api/@dxos/client/classes/EchoDatabase)</code>
### [internal](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L139)
Type: <code>Internal</code>
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L134)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L122)
Type: <code>boolean</code>
### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L117)
Type: <code>boolean</code>
### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L113)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L130)
Type: <code>[Document](/api/@dxos/client/classes/Document)</code>

## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L287)
=======
### [database](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L156)
Type: <code>[Database](/api/@dxos/client/classes/Database)</code>
### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L165)
Type: <code>Experimental</code>

Next-gen database.
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L243)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L152)
Type: <code>boolean</code>
### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L147)
Type: <code>boolean</code>
### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L143)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L239)
Type: <code>ObjectProperties</code>
### [reduce](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L185)
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.
### [select](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L177)
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.

## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L345)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`open`: <code>boolean</code>
<<<<<<< HEAD
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L205)
=======
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L227)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L244)
=======
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L302)
>>>>>>> 464c6e793 (docs wip)


Creates an interactive invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
<<<<<<< HEAD
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L282)
=======
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L340)
>>>>>>> 464c6e793 (docs wip)


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none
<<<<<<< HEAD
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L193)
=======
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L216)
>>>>>>> 464c6e793 (docs wip)


Called by EchoProxy close.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L209)
=======
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L231)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: none
<<<<<<< HEAD
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L147)
=======
### [getProperty(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L287)


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>any</code>
### [getTitle()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L272)


Returns: <code>never</code>

Arguments: none
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L193)
>>>>>>> 464c6e793 (docs wip)


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L201)
=======
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L223)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
<<<<<<< HEAD
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L237)
=======
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L295)
>>>>>>> 464c6e793 (docs wip)


Return set of space members.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)&gt;</code>

Arguments: none
<<<<<<< HEAD
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L271)
=======
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L329)
>>>>>>> 464c6e793 (docs wip)


Remove invitation from space.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
<<<<<<< HEAD
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L222)
=======
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L252)
>>>>>>> 464c6e793 (docs wip)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

<<<<<<< HEAD
`active`: <code>boolean</code>
=======
`active`: <code>boolean</code>
### [setProperty(key, \[value\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L280)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [setTitle(title)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L265)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`title`: <code>string</code>
>>>>>>> 464c6e793 (docs wip)

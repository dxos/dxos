# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:91](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L91)</sub>




## Constructors
### [constructor(_clientServices, _modelFactory, _state, databaseRouter, memberKey)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L110)


Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_state`: <code>Space</code>

`databaseRouter`: <code>DatabaseRouter</code>

`memberKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

## Properties
### [invitationsUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L97)
Type: <code>Event&lt;void | [CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)&gt;</code>
### [stateUpdate](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L98)
Type: <code>Event&lt;void&gt;</code>
### [database](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L148)
Type: <code>[Database](/api/@dxos/client/classes/Database)</code>
### [experimental](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L157)
Type: <code>Experimental</code>

Next-gen database.
### [invitations](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L233)
Type: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)[]</code>
### [isActive](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L144)
Type: <code>boolean</code>
### [isOpen](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L139)
Type: <code>boolean</code>
### [key](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L135)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [properties](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L229)
Type: <code>ObjectProperties</code>
### [reduce](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L177)
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.
### [select](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L169)
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.

## Methods
### [_setOpen(open)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L335)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`open`: <code>boolean</code>
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L219)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L292)


Creates an interactive invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L330)


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L208)


Called by EchoProxy close.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L223)


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: none
### [getProperty(key, \[defaultValue\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L277)


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>any</code>
### [getTitle()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L262)


Returns: <code>never</code>

Arguments: none
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L185)


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L215)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L285)


Return set of space members.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)&gt;</code>

Arguments: none
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L319)


Remove invitation from space.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L242)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`active`: <code>boolean</code>
### [setProperty(key, \[value\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L270)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [setTitle(title)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L255)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`title`: <code>string</code>
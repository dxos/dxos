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


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`open`: <code>boolean</code>
### [close()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L205)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L244)


Creates an interactive invitation.

Returns: <code>[CancellableInvitationObservable](/api/@dxos/client/interfaces/CancellableInvitationObservable)</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createSnapshot()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L282)


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none
### [destroy()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L193)


Called by EchoProxy close.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getDetails()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L209)


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: none
### [initialize()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L147)


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L201)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [queryMembers()](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L237)


Return set of space members.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)&gt;</code>

Arguments: none
### [removeInvitation(id)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L271)


Remove invitation from space.

Returns: <code>void</code>

Arguments: 

`id`: <code>string</code>
### [setActive(active)](https://github.com/dxos/dxos/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L222)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`active`: <code>boolean</code>
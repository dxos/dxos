# Class `SpaceProxy`
<sub>Declared in [packages/sdk/client/src/packlets/proxies/space-proxy.ts:81](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L81)</sub>




## Constructors
### [constructor(_clientServices, _modelFactory, _space, memberKey)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L95)


Returns: <code>[SpaceProxy](/api/@dxos/client/classes/SpaceProxy)</code>

Arguments: 

`_clientServices`: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

`_modelFactory`: <code>ModelFactory</code>

`_space`: <code>Space</code>

`memberKey`: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>

## Properties
### [invitationsUpdate](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L86)
Type: <code>Event&lt;[InvitationObservable](/api/@dxos/client/interfaces/InvitationObservable)&gt;</code>
### [stateUpdate](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L87)
Type: <code>Event&lt;void&gt;</code>
### [database](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L137)
Type: <code>[Database](/api/@dxos/client/classes/Database)</code>
### [invitations](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L217)
Type: <code>[InvitationObservable](/api/@dxos/client/interfaces/InvitationObservable)[]</code>
### [isActive](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L133)
Type: <code>boolean</code>
### [isOpen](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L128)
Type: <code>boolean</code>
### [key](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L124)
Type: <code>[PublicKey](/api/@dxos/client/classes/PublicKey)</code>
### [properties](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L213)
Type: <code>ObjectProperties</code>
### [reduce](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L157)
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.
### [select](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L149)
Type: <code>function</code>

Returns a selection context, which can be used to traverse the object graph.

## Methods
### [_setOpen(open)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L196)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`open`: <code>boolean</code>
### [close()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L186)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [createInvitation(\[options\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L261)


Creates an interactive invitation.

Returns: <code>Promise&lt;[InvitationObservable](/api/@dxos/client/interfaces/InvitationObservable)&gt;</code>

Arguments: 

`options`: <code>InvitationsOptions</code>
### [createSnapshot()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L286)


Implementation method.

Returns: <code>Promise&lt;SpaceSnapshot&gt;</code>

Arguments: none
### [destroy()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L176)


Called by EchoProxy close.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [getDetails()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L190)


Returns: <code>Promise&lt;SpaceDetails&gt;</code>

Arguments: none
### [getProperty(key, \[defaultValue\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L246)


Returns: <code>any</code>

Arguments: 

`key`: <code>string</code>

`defaultValue`: <code>any</code>
### [getTitle()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L231)


Returns: <code>never</code>

Arguments: none
### [initialize()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L164)


Called by EchoProxy open.

Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [open()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L182)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: none
### [queryMembers()](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L254)


Return set of space members.

Returns: <code>[ResultSet](/api/@dxos/client/classes/ResultSet)&lt;[SpaceMember](/api/@dxos/client/interfaces/SpaceMember)&gt;</code>

Arguments: none
### [setActive(active)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L203)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`active`: <code>boolean</code>
### [setProperty(key, \[value\])](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L239)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`key`: <code>string</code>

`value`: <code>any</code>
### [setTitle(title)](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L224)


Returns: <code>Promise&lt;void&gt;</code>

Arguments: 

`title`: <code>string</code>
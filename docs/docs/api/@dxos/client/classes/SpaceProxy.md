# Class `SpaceProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/space-proxy.ts:81`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L81)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L95)


Returns: [`SpaceProxy`](/api/@dxos/client/classes/SpaceProxy)

Arguments: 

`_clientServices`: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

`_modelFactory`: `ModelFactory`

`_space`: `Space`

`memberKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

## Properties
### [`invitationsUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L86)
Type: `Event<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`
### [`stateUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L87)
Type: `Event<void>`
### [`database`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L137)
Type: [`Database`](/api/@dxos/client/classes/Database)
### [`invitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L217)
Type: [`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`[]`
### [`isActive`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L133)
Type: `boolean`
### [`isOpen`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L128)
Type: `boolean`
### [`key`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L124)
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`properties`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L213)
Type: `ObjectProperties`
### [`reduce`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L157)
Type: `function`

Returns a selection context, which can be used to traverse the object graph.
### [`select`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L149)
Type: `function`

Returns a selection context, which can be used to traverse the object graph.

## Methods
### [`_setOpen`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L196)


Returns: `Promise<void>`

Arguments: 

`open`: `boolean`
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L186)


Returns: `Promise<void>`

Arguments: none
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L261)


Creates an interactive invitation.

Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: 

`options`: `InvitationsOptions`
### [`createSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L286)


Implementation method.

Returns: `Promise<SpaceSnapshot>`

Arguments: none
### [`destroy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L176)


Called by EchoProxy close.

Returns: `Promise<void>`

Arguments: none
### [`getDetails`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L190)


Returns: `Promise<SpaceDetails>`

Arguments: none
### [`getProperty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L246)


Returns: `any`

Arguments: 

`key`: `string`

`defaultValue`: `any`
### [`getTitle`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L231)


Returns: `never`

Arguments: none
### [`initialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L164)


Called by EchoProxy open.

Returns: `Promise<void>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L182)


Returns: `Promise<void>`

Arguments: none
### [`queryMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L254)


Return set of space members.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`SpaceMember`](/api/@dxos/client/interfaces/SpaceMember)`>`

Arguments: none
### [`setActive`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L203)


Returns: `Promise<void>`

Arguments: 

`active`: `boolean`
### [`setProperty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L239)


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`setTitle`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/space-proxy.ts#L224)


Returns: `Promise<void>`

Arguments: 

`title`: `string`
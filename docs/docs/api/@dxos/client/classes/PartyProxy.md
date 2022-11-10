# Class `PartyProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/party-proxy.ts:83`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L83)




## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L97)


Returns: [`PartyProxy`](/api/@dxos/client/classes/PartyProxy)

Arguments: 

`_clientServices`: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

`_modelFactory`: `ModelFactory`

`_party`: `Party`

`memberKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)

## Properties
### [`invitationsUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L88)
Type: `Event<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`
### [`stateUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L89)
Type: `Event<void>`
### [`database`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L140)
Type: [`Database`](/api/@dxos/client/classes/Database)
### [`invitations`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L222)
Type: [`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`[]`
### [`isActive`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L135)
Type: `boolean`
### [`isOpen`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L130)
Type: `boolean`
### [`key`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L126)
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`properties`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L218)
Type: `ObjectProperties`
### [`reduce`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L160)
Type: `function`

Returns a selection context, which can be used to traverse the object graph.
### [`select`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L152)
Type: `function`

Returns a selection context, which can be used to traverse the object graph.

## Methods
### [`_setOpen`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L201)


Returns: `Promise<void>`

Arguments: 

`open`: `boolean`
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L191)


Returns: `Promise<void>`

Arguments: none
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L266)


Creates an interactive invitation.

Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: 

`testing`: `boolean`
### [`createSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L293)


Implementation method.

Returns: `Promise<PartySnapshot>`

Arguments: none
### [`destroy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L181)


Called by EchoProxy close.

Returns: `Promise<void>`

Arguments: none
### [`getDetails`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L195)


Returns: `Promise<PartyDetails>`

Arguments: none
### [`getProperty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L251)


Returns: `any`

Arguments: 

`key`: `string`

`defaultValue`: `any`
### [`getTitle`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L236)


Returns: `never`

Arguments: none
### [`initialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L167)


Called by EchoProxy open.

Returns: `Promise<void>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L187)


Returns: `Promise<void>`

Arguments: none
### [`queryMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L259)


Return set of party members.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`PartyMember`](/api/@dxos/client/interfaces/PartyMember)`>`

Arguments: none
### [`setActive`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L208)


Returns: `Promise<void>`

Arguments: 

`active`: `boolean`
### [`setProperty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L244)


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`setTitle`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L229)


Returns: `Promise<void>`

Arguments: 

`title`: `string`
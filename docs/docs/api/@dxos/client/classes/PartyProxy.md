# Class `PartyProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/party-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L25)


Main public Party API.
Proxies requests to local/remove services.

## Constructors


## Properties
### [`database`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L83)
Type: [`Database`](/api/@dxos/client/classes/Database)
### [`invitationProxy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L66)
Type: [`InvitationProxy`](/api/@dxos/client/classes/InvitationProxy)
### [`isActive`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L78)
Type: `boolean`
### [`isOpen`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L74)
Type: `boolean`
### [`key`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L70)
Type: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`properties`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L159)
Type: `ObjectProperties`

TODO: Currently broken.
### [`reduce`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L101)
Type: `function`

Returns a selection context, which can be used to traverse the object graph.
### [`select`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L94)
Type: `function`

Returns a selection context, which can be used to traverse the object graph.

## Methods
### [`_setOpen`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L138)


Returns: `Promise<void>`

Arguments: 

`open`: `boolean`
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L130)


Returns: `Promise<void>`

Arguments: none
### [`createInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L214)


Creates an invitation to a given party.
The Invitation flow requires the inviter and invitee to be online at the same time.
If the invitee is known ahead of time,  `invitee_key`  can be provide to not require the secret exchange.
The invitation flow is protected by a generated pin code.

To be used with  `client.echo.acceptInvitation`  on the invitee side.

Returns: `Promise<`[`InvitationRequest`](/api/@dxos/client/classes/InvitationRequest)`>`

Arguments: 

`inviteeKey`: [`CreationInvitationOptions`](/api/@dxos/client/interfaces/CreationInvitationOptions)
### [`createSnapshot`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L222)


Implementation method.

Returns: `Promise<PartySnapshot>`

Arguments: none
### [`destroy`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L120)


Called by EchoProxy close.

Returns: `Promise<void>`

Arguments: none
### [`getDetails`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L134)


Returns: `Promise<PartyDetails>`

Arguments: none
### [`getProperty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L188)


Returns: `any`

Arguments: 

`key`: `string`

`defaultValue`: `any`
### [`getTitle`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L173)


Returns: `never`

Arguments: none
### [`initialize`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L108)


Called by EchoProxy open.

Returns: `Promise<void>`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L126)


Returns: `Promise<void>`

Arguments: none
### [`queryMembers`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L196)


Return set of party members.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<PartyMember>`

Arguments: none
### [`setActive`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L146)


Returns: `Promise<void>`

Arguments: 

`active`: `boolean`

`options`: `any`
### [`setProperty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L181)


Returns: `Promise<void>`

Arguments: 

`key`: `string`

`value`: `any`
### [`setTitle`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/party-proxy.ts#L166)


Returns: `Promise<void>`

Arguments: 

`title`: `string`
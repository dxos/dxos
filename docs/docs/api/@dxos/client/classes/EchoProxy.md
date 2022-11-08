# Class `EchoProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/echo-proxy.ts:25`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L25)


Client proxy to local/remote ECHO service.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L31)


Returns: [`EchoProxy`](/api/@dxos/client/classes/EchoProxy)

Arguments: 

`_serviceProvider`: `ClientServiceProvider`

`_modelFactory`: `ModelFactory`

`_haloProxy`: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

## Properties
### [`info`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L55)
Type: `object`
### [`modelFactory`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L41)
Type: `ModelFactory`
### [`networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L45)
Type: `any`

## Methods
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L192)


Joins an existing Party by invitation.

To be used with  `party.createInvitation`  on the inviter side.

Returns: [`PartyInvitation`](/api/@dxos/client/classes/PartyInvitation)

Arguments: 

`invitationDescriptor`: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)
### [`cloneParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L155)


Clones the party from a snapshot.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: 

`snapshot`: `PartySnapshot`
### [`createParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L134)


Creates a new party.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
### [`getParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L176)


Returns an individual party by its key.

Returns: `undefined | `[`Party`](/api/@dxos/client/interfaces/Party)

Arguments: 

`partyKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`queryParties`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L183)


Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
### [`registerModel`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L61)


Returns: [`EchoProxy`](/api/@dxos/client/classes/EchoProxy)

Arguments: 

`constructor`: `ModelConstructor<any>`
### [`toString`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L37)


Returns: `string`

Arguments: none
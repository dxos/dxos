# Class `EchoProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/echo-proxy.ts:36`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L36)


TODO(burdon): Public API (move comments here).

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L43)


Returns: [`EchoProxy`](/api/@dxos/client/classes/EchoProxy)

Arguments: 

`_serviceProvider`: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

`_modelFactory`: `ModelFactory`

`_haloProxy`: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

## Properties
### [`modelFactory`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L63)
Type: `ModelFactory`
### [`networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L70)
Type: `any`

## Methods
### [`[custom]`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L49)


Returns: `string`

Arguments: none
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L205)


Initiates an interactive accept invitation flow.

Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: 

`invitation`: [`Invitation`](/api/@dxos/client/interfaces/Invitation)
### [`cloneParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L170)


Clones the party from a snapshot.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: 

`snapshot`: `PartySnapshot`
### [`createParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L149)


Creates a new party.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
### [`getParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L191)


Returns an individual party by its key.

Returns: `undefined | `[`Party`](/api/@dxos/client/interfaces/Party)

Arguments: 

`partyKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`queryParties`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L198)


Query for all parties.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L54)


Returns: `object`

Arguments: none
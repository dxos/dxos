# Class `EchoProxy`
Declared in [`packages/sdk/client/src/packlets/proxies/echo-proxy.ts:37`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L37)


TODO(burdon): Public API (move comments here).

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L44)


Returns: [`EchoProxy`](/api/@dxos/client/classes/EchoProxy)

Arguments: 

`_serviceProvider`: [`ClientServicesProvider`](/api/@dxos/client/interfaces/ClientServicesProvider)

`_modelFactory`: `ModelFactory`

`_haloProxy`: [`HaloProxy`](/api/@dxos/client/classes/HaloProxy)

## Properties
### [`modelFactory`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L64)
Type: `ModelFactory`
### [`networkManager`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L71)
Type: `any`

## Methods
### [`[custom]`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L50)


Returns: `string`

Arguments: none
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L207)


Initiates an interactive accept invitation flow.

Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: 

`invitation`: [`Invitation`](/api/@dxos/client/interfaces/Invitation)

`options`: `InvitationsOptions`
### [`cloneSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L172)


Clones the space from a snapshot.

Returns: `Promise<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: 

`snapshot`: `SpaceSnapshot`
### [`createSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L151)


Creates a new space.

Returns: `Promise<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: none
### [`getSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L193)


Returns an individual space by its key.

Returns: `undefined | `[`Space`](/api/@dxos/client/interfaces/Space)

Arguments: 

`spaceKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`querySpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L200)


Query for all spaces.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: none
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L55)


Returns: `object`

Arguments: none
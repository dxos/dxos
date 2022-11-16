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
### [`acceptInvitation`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L206)


Initiates an interactive accept invitation flow.

Returns: `Promise<`[`InvitationObservable`](/api/@dxos/client/interfaces/InvitationObservable)`>`

Arguments: 

`invitation`: [`Invitation`](/api/@dxos/client/interfaces/Invitation)
### [`cloneSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L171)


Clones the space from a snapshot.

Returns: `Promise<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: 

`snapshot`: `SpaceSnapshot`
### [`createSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L150)


Creates a new space.

Returns: `Promise<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: none
### [`getSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L192)


Returns an individual space by its key.

Returns: `undefined | `[`Space`](/api/@dxos/client/interfaces/Space)

Arguments: 

`spaceKey`: [`PublicKey`](/api/@dxos/client/classes/PublicKey)
### [`querySpaces`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L199)


Query for all spaces.

Returns: [`ResultSet`](/api/@dxos/client/classes/ResultSet)`<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: none
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/echo-proxy.ts#L54)


Returns: `object`

Arguments: none
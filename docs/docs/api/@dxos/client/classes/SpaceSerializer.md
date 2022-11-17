# Class `SpaceSerializer`
Declared in [`packages/sdk/client/src/packlets/client/serializer.ts:16`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L16)


Import/export space.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L18)


Returns: [`SpaceSerializer`](/api/@dxos/client/classes/SpaceSerializer)

Arguments: 

`_client`: [`Client`](/api/@dxos/client/classes/Client)

## Properties


## Methods
### [`deserializeSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L27)


Returns: `Promise<`[`Space`](/api/@dxos/client/interfaces/Space)`>`

Arguments: 

`data`: `Uint8Array`
### [`serializeSpace`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L22)


Returns: `Promise<Blob>`

Arguments: 

`space`: [`Space`](/api/@dxos/client/interfaces/Space)
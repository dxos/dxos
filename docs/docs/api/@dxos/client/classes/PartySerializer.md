# Class `PartySerializer`
Declared in [`packages/sdk/client/src/packlets/client/serializer.ts:16`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L16)


Import/export party.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L18)


Returns: [`PartySerializer`](/api/@dxos/client/classes/PartySerializer)

Arguments: 

`_client`: [`Client`](/api/@dxos/client/classes/Client)

## Properties


## Methods
### [`deserializeParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L27)


Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: 

`data`: `Uint8Array`
### [`serializeParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/serializer.ts#L22)


Returns: `Promise<Blob>`

Arguments: 

`party`: [`Party`](/api/@dxos/client/interfaces/Party)
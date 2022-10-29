# Class `PartySerializer`
Declared in [`packages/sdk/client/src/packlets/proxies/serializer.ts:15`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L15)


Import/export party.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L16)


Returns: [`PartySerializer`](/api/@dxos/client/classes/PartySerializer)

Arguments: 

`_client`: [`Client`](/api/@dxos/client/classes/Client)

## Properties


## Methods
### [`deserializeParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L25)


Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: 

`data`: `Uint8Array`
### [`serializeParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L20)


Returns: `Promise<Blob>`

Arguments: 

`party`: [`Party`](/api/@dxos/client/interfaces/Party)
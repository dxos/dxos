# Class `PartySerializer`
> Declared in [`packages/sdk/client/src/packlets/proxies/serializer.ts:15`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/proxies/serializer.ts#L15)


Import/export party.

## Constructors
### constructor
```ts
(_client: [Client](/api/@dxos/client/classes/Client)) => [PartySerializer](/api/@dxos/client/classes/PartySerializer)
```

## Properties


## Methods
### deserializeParty
```ts
(data: Uint8Array) => Promise<[Party](/api/@dxos/client/interfaces/Party)>
```
### serializeParty
```ts
(party: [Party](/api/@dxos/client/interfaces/Party)) => Promise<Blob>
```
# Class `PartySerializer`
> Declared in [`packages/sdk/client/src/packlets/proxies/serializer.ts`]()

Import/export party.

## Constructors
```ts
new PartySerializer (_client: Client) => PartySerializer
```

## Properties


## Functions
```ts
deserializeParty (data: Uint8Array) => Promise<Party>
```
```ts
serializeParty (party: Party) => Promise<Blob>
```
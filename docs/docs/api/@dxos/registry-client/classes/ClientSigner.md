# Class `ClientSigner`
> Declared in [`packages/sdk/registry-client/src/util/client-signer.ts`]()

Can be used as an external signer for signing DXNS transactions.
Uses a DXNS key stored in HALO.

## Constructors
```ts
new ClientSigner (client: Client, registry: Registry, address: string) => ClientSigner
```

## Properties


## Functions
```ts
signRaw (__namedParameters: SignerPayloadRaw) => Promise<SignerResult>
```
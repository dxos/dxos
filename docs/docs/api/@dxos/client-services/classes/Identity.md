# Class `Identity`
> Declared in [`packages/sdk/client-services/src/packlets/identity/identity.ts`]()

Agent identity manager, which includes the agent's Halo space.

## Constructors
```ts
new Identity (__namedParameters: IdentityParams) => Identity
```

## Properties
### `deviceKey: PublicKey`
### `identityKey: PublicKey`

## Functions
```ts
close () => Promise<void>
```
```ts
getDeviceCredentialSigner () => CredentialSigner
```
Issues credentials as device.
```ts
getIdentityCredentialSigner () => CredentialSigner
```
Issues credentials as identity.
Requires identity to be ready.
```ts
open () => Promise<void>
```
```ts
ready () => Promise<void>
```
# Class `Identity`
Declared in [`packages/sdk/client-services/src/packlets/identity/identity.ts:30`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L30)


Agent identity manager, which includes the agent's Halo space.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L40)


Returns: [`Identity`](/api/@dxos/client-services/classes/Identity)

Arguments: 

`__namedParameters`: [`IdentityParams`](/api/@dxos/client-services/types/IdentityParams)

## Properties
### [`deviceKey`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L36)
Type: `PublicKey`
### [`identityKey`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L35)
Type: `PublicKey`
### [`stateUpdate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L38)
Type: `Event<void>`
### [`authorizedDeviceKeys`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L57)
Type: `ComplexSet<PublicKey>`
### [`controlPipeline`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L78)
Type: `PipelineAccessor`

@test-only
### [`haloDatabase`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L90)
Type: `Database`
### [`haloGenesisFeedKey`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L86)
Type: `PublicKey`
### [`haloSpaceKey`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L82)
Type: `PublicKey`

## Methods
### [`close`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L65)


Returns: `Promise<void>`

Arguments: none
### [`getDeviceCredentialSigner`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L110)


Issues credentials as device.

Returns: `CredentialSigner`

Arguments: none
### [`getIdentityCredentialSigner`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L98)


Issues credentials as identity.
Requires identity to be ready.

Returns: `CredentialSigner`

Arguments: none
### [`open`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L61)


Returns: `Promise<void>`

Arguments: none
### [`ready`](https://github.com/dxos/protocols/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L69)


Returns: `Promise<void>`

Arguments: none
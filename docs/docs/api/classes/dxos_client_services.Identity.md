# Class: Identity

[@dxos/client-services](../modules/dxos_client_services.md).Identity

Agent identity manager, which includes the agent's Halo space.

## Constructors

### constructor

**new Identity**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`IdentityParams`](../types/dxos_client_services.IdentityParams.md) |

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:35](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L35)

## Properties

### \_deviceStateMachine

 `Private` `Readonly` **\_deviceStateMachine**: `DeviceStateMachine`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L33)

___

### \_signer

 `Private` `Readonly` **\_signer**: `Signer`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:31](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L31)

___

### \_space

 `Private` `Readonly` **\_space**: `Space`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L32)

___

### device_key

 `Readonly` **device_key**: `PublicKey`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:29](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L29)

___

### identity_key

 `Readonly` **identity_key**: `PublicKey`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L28)

## Accessors

### authorizedDeviceKeys

`get` **authorizedDeviceKeys**(): `ComplexSet`<`PublicKey`\>

#### Returns

`ComplexSet`<`PublicKey`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:56](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L56)

___

### controlPipeline

`get` **controlPipeline**(): `PipelineAccessor`

@test-only

#### Returns

`PipelineAccessor`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:77](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L77)

___

### haloDatabase

`get` **haloDatabase**(): `Database`

#### Returns

`Database`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:89](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L89)

___

### haloGenesisFeedKey

`get` **haloGenesisFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:85](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L85)

___

### halo_space_key

`get` **halo_space_key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:81](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L81)

## Methods

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:64](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L64)

___

### getDeviceCredentialSigner

**getDeviceCredentialSigner**(): `CredentialSigner`

Issues credentials as device.

#### Returns

`CredentialSigner`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:105](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L105)

___

### getIdentityCredentialSigner

**getIdentityCredentialSigner**(): `CredentialSigner`

Issues credentials as identity.
Requires identity to be ready.

#### Returns

`CredentialSigner`

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:97](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L97)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:60](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L60)

___

### ready

**ready**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/sdk/client-services/src/packlets/identity/identity.ts:68](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/identity/identity.ts#L68)

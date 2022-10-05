# Class: CredentialGenerator

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).CredentialGenerator

Utility class for generating credential messages, where the issuer is the current identity or device.

## Constructors

### constructor

**new CredentialGenerator**(`_keyring`, `_identityKey`, `_deviceKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_keyring` | `Signer` |
| `_identityKey` | `PublicKey` |
| `_deviceKey` | `PublicKey` |

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-generator.ts:17](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-generator.ts#L17)

## Methods

### createDeviceAuthorization

**createDeviceAuthorization**(`device_key`): `Promise`<`Credential`\>

Add device to space.

#### Parameters

| Name | Type |
| :------ | :------ |
| `device_key` | `PublicKey` |

#### Returns

`Promise`<`Credential`\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-generator.ts:87](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-generator.ts#L87)

___

### createFeedAdmission

**createFeedAdmission**(`party_key`, `feedKey`, `designation`): `Promise`<`Credential`\>

Add feed to space.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party_key` | `PublicKey` |
| `feedKey` | `PublicKey` |
| `designation` | `Designation` |

#### Returns

`Promise`<`Credential`\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-generator.ts:105](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-generator.ts#L105)

___

### createMemberInvitation

**createMemberInvitation**(`party_key`, `identity_key`, `device_key`, `controlKey`, `dataKey`): `Promise`<`Credential`[]\>

Create invitation.
Admit identity and control and data feeds.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party_key` | `PublicKey` |
| `identity_key` | `PublicKey` |
| `device_key` | `PublicKey` |
| `controlKey` | `PublicKey` |
| `dataKey` | `PublicKey` |

#### Returns

`Promise`<`Credential`[]\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-generator.ts:60](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-generator.ts#L60)

___

### createSpaceGenesis

**createSpaceGenesis**(`party_key`, `controlKey`): `Promise`<`Credential`[]\>

Create genesis messages for new Space.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party_key` | `PublicKey` |
| `controlKey` | `PublicKey` |

#### Returns

`Promise`<`Credential`[]\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-generator.ts:26](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-generator.ts#L26)

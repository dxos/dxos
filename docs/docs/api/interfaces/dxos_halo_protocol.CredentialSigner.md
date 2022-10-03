# Interface: CredentialSigner

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).CredentialSigner

## Properties

### createCredential

 **createCredential**: (`params`: [`CreateCredentialSignerParams`](../types/dxos_halo_protocol.CreateCredentialSignerParams.md)) => `Promise`<`Credential`\>

#### Type declaration

(`params`): `Promise`<`Credential`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | [`CreateCredentialSignerParams`](../types/dxos_halo_protocol.CreateCredentialSignerParams.md) |

##### Returns

`Promise`<`Credential`\>

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-factory.ts:90](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-factory.ts#L90)

## Methods

### getIssuer

**getIssuer**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/core/halo/halo-protocol/src/credentials/credential-factory.ts:89](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/credentials/credential-factory.ts#L89)

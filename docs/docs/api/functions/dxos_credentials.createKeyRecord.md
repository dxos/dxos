# Function: createKeyRecord

[@dxos/credentials](../modules/dxos_credentials.md).createKeyRecord

**createKeyRecord**(`attributes?`, `keyPair?`): `KeyRecord`

Create a new KeyRecord with the indicated attributes.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `attributes` | `Partial`<`KeyRecord`\> | Valid attributes above. |
| `keyPair` | `MakeOptional`<`KeyPair`, ``"secretKey"``\> | If undefined then a public/private key pair will be generated. |

#### Returns

`KeyRecord`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:111](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keyring-helpers.ts#L111)

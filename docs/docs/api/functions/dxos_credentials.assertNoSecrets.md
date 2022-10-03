# Function: assertNoSecrets

[@dxos/credentials](../modules/dxos_credentials.md).assertNoSecrets

**assertNoSecrets**(`keyRecord`): `void`

Checks that the KeyRecord contains no secrets (ie, secretKey and seedPhrase).

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> |

#### Returns

`void`

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:74](https://github.com/dxos/dxos/blob/main/packages/halo/credentials/src/keys/keyring-helpers.ts#L74)

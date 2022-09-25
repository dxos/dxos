# Function: checkAndNormalizeKeyRecord

[@dxos/credentials](../modules/dxos_credentials.md).checkAndNormalizeKeyRecord

**checkAndNormalizeKeyRecord**(`keyRecord`): `KeyRecord`

Checks conformity and normalizes the KeyRecord. (Used before storing, so that only well-formed records are stored.)

#### Parameters

| Name | Type |
| :------ | :------ |
| `keyRecord` | `Omit`<`KeyRecord`, ``"key"``\> |

#### Returns

`KeyRecord`

A normalized copy of keyRecord.

#### Defined in

[packages/halo/credentials/src/keys/keyring-helpers.ts:173](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/keys/keyring-helpers.ts#L173)

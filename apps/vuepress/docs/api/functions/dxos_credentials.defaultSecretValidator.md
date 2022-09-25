# Function: defaultSecretValidator

[@dxos/credentials](../modules/dxos_credentials.md).defaultSecretValidator

**defaultSecretValidator**(`invitation`, `secret`): `Promise`<`boolean`\>

Validates the shared secret during an invitation process.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | [`Invitation`](../classes/dxos_credentials.Invitation.md) |
| `secret` | `Buffer` |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/halo/credentials/src/greet/invitation.ts:27](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/greet/invitation.ts#L27)

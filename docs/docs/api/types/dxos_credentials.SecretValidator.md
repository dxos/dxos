# Type alias: SecretValidator

[@dxos/credentials](../modules/dxos_credentials.md).SecretValidator

 **SecretValidator**: (`invitation`: `never`, `secret`: `Buffer`) => `Promise`<`boolean`\>

#### Type declaration

(`invitation`, `secret`): `Promise`<`boolean`\>

Validates the shared secret during an invitation process.

##### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | `never` |
| `secret` | `Buffer` |

##### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/core/halo/credentials/src/invitations.ts:22](https://github.com/dxos/dxos/blob/main/packages/core/halo/credentials/src/invitations.ts#L22)

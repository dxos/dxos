# Type alias: SecretProvider

[@dxos/credentials](../modules/dxos_credentials.md).SecretProvider

 **SecretProvider**: (`info?`: [`SecretInfo`](../interfaces/dxos_credentials.SecretInfo.md)) => `Promise`<`Buffer`\>

#### Type declaration

(`info?`): `Promise`<`Buffer`\>

Provides a shared secret during an invitation process.

##### Parameters

| Name | Type |
| :------ | :------ |
| `info?` | [`SecretInfo`](../interfaces/dxos_credentials.SecretInfo.md) |

##### Returns

`Promise`<`Buffer`\>

#### Defined in

[packages/core/halo/credentials/src/invitations.ts:17](https://github.com/dxos/dxos/blob/main/packages/core/halo/credentials/src/invitations.ts#L17)

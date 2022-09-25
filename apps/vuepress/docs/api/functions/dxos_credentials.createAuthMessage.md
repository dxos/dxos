# Function: createAuthMessage

[@dxos/credentials](../modules/dxos_credentials.md).createAuthMessage

**createAuthMessage**(`signer`, `partyKey`, `identityKey`, `deviceKey`, `feedKey?`, `nonce?`, `feedAdmit?`): `WithTypeUrl`<`Message`\>

Create `dxos.credentials.auth.Auth` credentials.

#### Parameters

| Name | Type |
| :------ | :------ |
| `signer` | [`Signer`](../interfaces/dxos_credentials.Signer.md) |
| `partyKey` | `PublicKeyLike` |
| `identityKey` | `KeyRecord` |
| `deviceKey` | `KeyRecord` \| `KeyChain` |
| `feedKey?` | `PublicKey` |
| `nonce?` | `Buffer` |
| `feedAdmit?` | `Message` |

#### Returns

`WithTypeUrl`<`Message`\>

#### Defined in

[packages/halo/credentials/src/auth/auth-message.ts:19](https://github.com/dxos/dxos/blob/db8188dae/packages/halo/credentials/src/auth/auth-message.ts#L19)

# Function: createHaloRecoveryPlugin

[@dxos/echo-db](../modules/dxos_echo_db.md).createHaloRecoveryPlugin

**createHaloRecoveryPlugin**(`identityKey`, `invitationFactory`, `peerId`): `GreetingCommandPlugin`

Creates network protocol plugin that allows peers to recover access to their HALO.
Plugin is intended to be used in HALO party swarm.

#### Parameters

| Name | Type |
| :------ | :------ |
| `identityKey` | `PublicKey` |
| `invitationFactory` | [`InvitationFactory`](../classes/dxos_echo_db.InvitationFactory.md) |
| `peerId` | `PublicKey` |

#### Returns

`GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/halo-recovery-plugin.ts:15](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/protocol/halo-recovery-plugin.ts#L15)

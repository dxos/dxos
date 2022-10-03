# Function: createOfflineInvitationPlugin

[@dxos/echo-db](../modules/dxos_echo_db.md).createOfflineInvitationPlugin

**createOfflineInvitationPlugin**(`invitationFactory`, `peerId`): `GreetingCommandPlugin`

Creates network protocol plugin that allows peers to claim offline invitations.
Plugin is intended to be used in data-party swarms.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationFactory` | [`InvitationFactory`](../classes/dxos_echo_db.InvitationFactory.md) |
| `peerId` | `PublicKey` |

#### Returns

`GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/offline-invitation-plugin.ts:14](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/protocol/offline-invitation-plugin.ts#L14)

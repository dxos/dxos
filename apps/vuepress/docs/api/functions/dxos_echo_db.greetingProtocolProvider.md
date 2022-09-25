# Function: greetingProtocolProvider

[@dxos/echo-db](../modules/dxos_echo_db.md).greetingProtocolProvider

**greetingProtocolProvider**(`rendezvousKey`, `peerId`, `protocolPlugins`): `ProtocolProvider`

Creates a duplex connection with a single peer using a common rendezvous key as topic.

#### Parameters

| Name | Type |
| :------ | :------ |
| `rendezvousKey` | `any` |
| `peerId` | `Uint8Array` \| `Buffer` |
| `protocolPlugins` | `any`[] |

#### Returns

`ProtocolProvider`

swarm

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-protocol-provider.ts:17](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/invitations/greeting-protocol-provider.ts#L17)

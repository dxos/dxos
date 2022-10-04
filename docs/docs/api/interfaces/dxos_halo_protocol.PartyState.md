# Interface: PartyState

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).PartyState

## Implemented by

- [`PartyStateMachine`](../classes/dxos_halo_protocol.PartyStateMachine.md)

## Properties

### credentials

 `Readonly` **credentials**: `Credential`[]

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:18](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L18)

___

### feeds

 `Readonly` **feeds**: `ReadonlyMap`<`PublicKey`, [`FeedInfo`](dxos_halo_protocol.FeedInfo.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:17](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L17)

___

### genesisCredential

 `Readonly` **genesisCredential**: `undefined` \| `Credential`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:15](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L15)

___

### members

 `Readonly` **members**: `ReadonlyMap`<`PublicKey`, [`MemberInfo`](dxos_halo_protocol.MemberInfo.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:16](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L16)

# Class: MemberStateMachine

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).MemberStateMachine

Tracks the list of members (with roles) for the party.
Provides a list of admitted feeds.

## Constructors

### constructor

**new MemberStateMachine**(`_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts:31](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts#L31)

## Properties

### \_members

 `Private` **\_members**: `ComplexMap`<`PublicKey`, [`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>

Member IDENTITY key => info

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts:27](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts#L27)

___

### onMemberAdmitted

 `Readonly` **onMemberAdmitted**: `Callback`<`AsyncCallback`<[`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts:29](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts#L29)

## Accessors

### members

`get` **members**(): `ReadonlyMap`<`PublicKey`, [`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>

#### Returns

`ReadonlyMap`<`PublicKey`, [`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts#L35)

## Methods

### getRole

**getRole**(`member`): `undefined` \| `Role`

#### Parameters

| Name | Type |
| :------ | :------ |
| `member` | `PublicKey` |

#### Returns

`undefined` \| `Role`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts#L39)

___

### process

**process**(`credential`): `Promise`<`void`\>

Processes the PartyMember credential.
Assumes the credential is already pre-verified
and the issuer has been authorized to issue credentials of this type.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credential` | `Credential` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/member-state-machine.ts#L49)

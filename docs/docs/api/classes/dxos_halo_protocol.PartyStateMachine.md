# Class: PartyStateMachine

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).PartyStateMachine

Validates and processes credentials for a single party.
Keeps a list of members and feeds.
Keeps and in-memory index of credentials and allows to query them.

## Implements

- [`PartyState`](../interfaces/dxos_halo_protocol.PartyState.md)

## Constructors

### constructor

**new PartyStateMachine**(`_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:36](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L36)

## Properties

### \_credentials

 `Private` `Readonly` **\_credentials**: `Credential`[] = `[]`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:29](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L29)

___

### \_feeds

 `Private` `Readonly` **\_feeds**: [`FeedStateMachine`](dxos_halo_protocol.FeedStateMachine.md)

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:28](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L28)

___

### \_genesisCredential

 `Private` **\_genesisCredential**: `undefined` \| `Credential`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:30](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L30)

___

### \_members

 `Private` `Readonly` **\_members**: [`MemberStateMachine`](dxos_halo_protocol.MemberStateMachine.md)

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:27](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L27)

___

### onCredentialProcessed

 `Readonly` **onCredentialProcessed**: `Callback`<`AsyncCallback`<`Credential`\>\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:32](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L32)

___

### onFeedAdmitted

 `Readonly` **onFeedAdmitted**: `Callback`<`AsyncCallback`<[`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:33](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L33)

___

### onMemberAdmitted

 `Readonly` **onMemberAdmitted**: `Callback`<`AsyncCallback`<[`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:34](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L34)

## Accessors

### credentials

`get` **credentials**(): `Credential`[]

#### Returns

`Credential`[]

#### Implementation of

[PartyState](../interfaces/dxos_halo_protocol.PartyState.md).[credentials](../interfaces/dxos_halo_protocol.PartyState.md#credentials)

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:52](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L52)

___

### feeds

`get` **feeds**(): `ReadonlyMap`<`PublicKey`, [`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>

#### Returns

`ReadonlyMap`<`PublicKey`, [`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>

#### Implementation of

[PartyState](../interfaces/dxos_halo_protocol.PartyState.md).[feeds](../interfaces/dxos_halo_protocol.PartyState.md#feeds)

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:48](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L48)

___

### genesisCredential

`get` **genesisCredential**(): `undefined` \| `Credential`

#### Returns

`undefined` \| `Credential`

#### Implementation of

[PartyState](../interfaces/dxos_halo_protocol.PartyState.md).[genesisCredential](../interfaces/dxos_halo_protocol.PartyState.md#genesiscredential)

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:40](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L40)

___

### members

`get` **members**(): `ReadonlyMap`<`PublicKey`, [`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>

#### Returns

`ReadonlyMap`<`PublicKey`, [`MemberInfo`](../interfaces/dxos_halo_protocol.MemberInfo.md)\>

#### Implementation of

[PartyState](../interfaces/dxos_halo_protocol.PartyState.md).[members](../interfaces/dxos_halo_protocol.PartyState.md#members)

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L44)

## Methods

### \_canAdmitFeeds

`Private` **_canAdmitFeeds**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |

#### Returns

`boolean`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:117](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L117)

___

### \_canInviteNewMembers

`Private` **_canInviteNewMembers**(`key`): `boolean`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `PublicKey` |

#### Returns

`boolean`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:113](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L113)

___

### process

**process**(`credential`, `fromFeed`): `Promise`<`boolean`\>

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `credential` | `Credential` | - |
| `fromFeed` | `PublicKey` | Key of the feed where this credential is recorded. |

#### Returns

`Promise`<`boolean`\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts:59](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/party-state-machine.ts#L59)

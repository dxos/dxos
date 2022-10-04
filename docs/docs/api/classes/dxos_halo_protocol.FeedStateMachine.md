# Class: FeedStateMachine

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).FeedStateMachine

Tracks the feed tree for a party.
Provides a list of admitted feeds.

## Constructors

### constructor

**new FeedStateMachine**(`_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L35)

## Properties

### \_feeds

 `Private` **\_feeds**: `ComplexMap`<`PublicKey`, [`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:31](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L31)

___

### onFeedAdmitted

 `Readonly` **onFeedAdmitted**: `Callback`<`AsyncCallback`<[`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:33](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L33)

## Accessors

### feeds

`get` **feeds**(): `ReadonlyMap`<`PublicKey`, [`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>

#### Returns

`ReadonlyMap`<`PublicKey`, [`FeedInfo`](../interfaces/dxos_halo_protocol.FeedInfo.md)\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:39](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L39)

## Methods

### process

**process**(`credential`, `fromFeed`): `Promise`<`void`\>

Processes the AdmittedFeed credential.
Assumes the credential is already pre-verified
and the issuer has been authorized to issue credentials of this type.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `credential` | `Credential` | - |
| `fromFeed` | `PublicKey` | Key of the feed where this credential is recorded. |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L49)

# Class: HaloFactory

[@dxos/echo-db](../modules/dxos_echo_db.md).HaloFactory

Create and manage HALO parties.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.HaloFactory.md#constructor)

### Methods

- [\_joinHalo](dxos_echo_db.HaloFactory.md#_joinhalo)
- [constructParty](dxos_echo_db.HaloFactory.md#constructparty)
- [createHalo](dxos_echo_db.HaloFactory.md#createhalo)
- [joinHalo](dxos_echo_db.HaloFactory.md#joinhalo)
- [recoverHalo](dxos_echo_db.HaloFactory.md#recoverhalo)

## Constructors

### constructor

• **new HaloFactory**(`_networkManager`, `_modelFactory`, `_snapshotStore`, `_feedProviderFactory`, `_keyring`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_modelFactory` | `ModelFactory` |
| `_snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_feedProviderFactory` | (`partyKey`: `PublicKey`) => [`PartyFeedProvider`](dxos_echo_db.PartyFeedProvider.md) |
| `_keyring` | `Keyring` |
| `_options` | [`PipelineOptions`](../interfaces/dxos_echo_db.PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:54](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo-factory.ts#L54)

## Methods

### \_joinHalo

▸ `Private` **_joinHalo**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:158](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo-factory.ts#L158)

___

### constructParty

▸ **constructParty**(): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:63](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo-factory.ts#L63)

___

### createHalo

▸ **createHalo**(`options?`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`HaloCreationOptions`](../interfaces/dxos_echo_db.HaloCreationOptions.md) |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:79](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo-factory.ts#L79)

___

### joinHalo

▸ **joinHalo**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:152](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo-factory.ts#L152)

___

### recoverHalo

▸ **recoverHalo**(`seedPhrase`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:135](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo-factory.ts#L135)

# Class: HaloFactory

Create and manage HALO parties.

## Table of contents

### Constructors

- [constructor](HaloFactory.md#constructor)

### Methods

- [\_joinHalo](HaloFactory.md#_joinhalo)
- [constructParty](HaloFactory.md#constructparty)
- [createHalo](HaloFactory.md#createhalo)
- [joinHalo](HaloFactory.md#joinhalo)
- [recoverHalo](HaloFactory.md#recoverhalo)

## Constructors

### constructor

• **new HaloFactory**(`_networkManager`, `_modelFactory`, `_snapshotStore`, `_feedProviderFactory`, `_keyring`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_modelFactory` | `ModelFactory` |
| `_snapshotStore` | [`SnapshotStore`](SnapshotStore.md) |
| `_feedProviderFactory` | (`partyKey`: `PublicKey`) => [`PartyFeedProvider`](PartyFeedProvider.md) |
| `_keyring` | `Keyring` |
| `_options` | [`PipelineOptions`](../interfaces/PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:54](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-factory.ts#L54)

## Methods

### \_joinHalo

▸ `Private` **_joinHalo**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:158](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-factory.ts#L158)

___

### constructParty

▸ **constructParty**(): `Promise`<[`HaloParty`](HaloParty.md)\>

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:63](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-factory.ts#L63)

___

### createHalo

▸ **createHalo**(`options?`): `Promise`<[`HaloParty`](HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`HaloCreationOptions`](../interfaces/HaloCreationOptions.md) |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:79](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-factory.ts#L79)

___

### joinHalo

▸ **joinHalo**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:152](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-factory.ts#L152)

___

### recoverHalo

▸ **recoverHalo**(`seedPhrase`): `Promise`<[`HaloParty`](HaloParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:135](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-factory.ts#L135)

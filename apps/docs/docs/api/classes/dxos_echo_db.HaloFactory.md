---
id: "dxos_echo_db.HaloFactory"
title: "Class: HaloFactory"
sidebar_label: "HaloFactory"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).HaloFactory

Create and manage HALO parties.

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

[packages/echo/echo-db/src/halo/halo-factory.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-factory.ts#L48)

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

[packages/echo/echo-db/src/halo/halo-factory.ts:152](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-factory.ts#L152)

___

### constructParty

▸ **constructParty**(): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-factory.ts:57](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-factory.ts#L57)

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

[packages/echo/echo-db/src/halo/halo-factory.ts:73](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-factory.ts#L73)

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

[packages/echo/echo-db/src/halo/halo-factory.ts:146](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-factory.ts#L146)

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

[packages/echo/echo-db/src/halo/halo-factory.ts:129](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-factory.ts#L129)

---
id: "dxos_echo_db.DataMirror"
title: "Class: DataMirror"
sidebar_label: "DataMirror"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).DataMirror

Maintains subscriptions via DataService to create a local copy of the entities (items and links) in the database.

Entities are updated using snapshots and mutations sourced from the DataService.
Entity and model mutations are forwarded to the DataService.
This class is analogous to ItemDemuxer but for databases running in remote mode.

## Constructors

### constructor

• **new DataMirror**(`_itemManager`, `_dataService`, `_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |
| `_dataService` | `DataService` |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-mirror.ts:28](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/data-mirror.ts#L28)

## Methods

### \_subscribeToUpdates

▸ `Private` **_subscribeToUpdates**(`entity`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `entity` | [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\> |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-mirror.ts:77](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/data-mirror.ts#L77)

___

### open

▸ **open**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/packlets/database/data-mirror.ts:34](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/packlets/database/data-mirror.ts#L34)

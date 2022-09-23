---
id: "dxos_echo_db.ItemDemuxer"
title: "Class: ItemDemuxer"
sidebar_label: "ItemDemuxer"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).ItemDemuxer

Creates a stream that consumes `IEchoStream` messages and routes them to the associated items.

**`Param`**

## Constructors

### constructor

• **new ItemDemuxer**(`_itemManager`, `_modelFactory`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_itemManager` | [`ItemManager`](dxos_echo_db.ItemManager.md) |
| `_modelFactory` | `ModelFactory` |
| `_options` | [`ItemDemuxerOptions`](../interfaces/dxos_echo_db.ItemDemuxerOptions.md) |

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:33](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L33)

## Properties

### mutation

• `Readonly` **mutation**: `Event`<`IEchoStream`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:31](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L31)

## Methods

### createItemSnapshot

▸ **createItemSnapshot**(`item`): `ItemSnapshot`

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | [`Item`](dxos_echo_db.Item.md)<`Model`<`any`, `any`\>\> |

#### Returns

`ItemSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:126](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L126)

___

### createLinkSnapshot

▸ **createLinkSnapshot**(`link`): `LinkSnapshot`

#### Parameters

| Name | Type |
| :------ | :------ |
| `link` | [`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\> |

#### Returns

`LinkSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:138](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L138)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:118](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L118)

___

### open

▸ **open**(): [`EchoProcessor`](../modules/dxos_echo_db.md#echoprocessor)

#### Returns

[`EchoProcessor`](../modules/dxos_echo_db.md#echoprocessor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:39](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L39)

___

### restoreFromSnapshot

▸ **restoreFromSnapshot**(`snapshot`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `DatabaseSnapshot` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:151](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L151)

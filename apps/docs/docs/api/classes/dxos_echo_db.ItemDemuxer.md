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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:34](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L34)

## Properties

### mutation

• `Readonly` **mutation**: `Event`<`IEchoStream`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:32](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L32)

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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:127](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L127)

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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:139](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L139)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:119](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L119)

___

### open

▸ **open**(): [`EchoProcessor`](../modules/dxos_echo_db.md#echoprocessor)

#### Returns

[`EchoProcessor`](../modules/dxos_echo_db.md#echoprocessor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:40](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L40)

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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:152](https://github.com/dxos/dxos/blob/b06737400/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L152)

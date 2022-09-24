# Class: ItemDemuxer

Creates a stream that consumes `IEchoStream` messages and routes them to the associated items.

**`Param`**

## Table of contents

### Constructors

- [constructor](ItemDemuxer.md#constructor)

### Properties

- [mutation](ItemDemuxer.md#mutation)

### Methods

- [createItemSnapshot](ItemDemuxer.md#createitemsnapshot)
- [createLinkSnapshot](ItemDemuxer.md#createlinksnapshot)
- [createSnapshot](ItemDemuxer.md#createsnapshot)
- [open](ItemDemuxer.md#open)
- [restoreFromSnapshot](ItemDemuxer.md#restorefromsnapshot)

## Constructors

### constructor

• **new ItemDemuxer**(`_itemManager`, `_modelFactory`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_itemManager` | [`ItemManager`](ItemManager.md) |
| `_modelFactory` | `ModelFactory` |
| `_options` | [`ItemDemuxerOptions`](../interfaces/ItemDemuxerOptions.md) |

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:34](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L34)

## Properties

### mutation

• `Readonly` **mutation**: `Event`<`IEchoStream`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:32](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L32)

## Methods

### createItemSnapshot

▸ **createItemSnapshot**(`item`): `ItemSnapshot`

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | [`Item`](Item.md)<`Model`<`any`, `any`\>\> |

#### Returns

`ItemSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:127](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L127)

___

### createLinkSnapshot

▸ **createLinkSnapshot**(`link`): `LinkSnapshot`

#### Parameters

| Name | Type |
| :------ | :------ |
| `link` | [`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\> |

#### Returns

`LinkSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:139](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L139)

___

### createSnapshot

▸ **createSnapshot**(): `DatabaseSnapshot`

#### Returns

`DatabaseSnapshot`

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:119](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L119)

___

### open

▸ **open**(): [`EchoProcessor`](../modules.md#echoprocessor)

#### Returns

[`EchoProcessor`](../modules.md#echoprocessor)

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:40](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L40)

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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:152](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L152)

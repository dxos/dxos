# Interface: MutationWriteReceipt

[@dxos/model-factory](../modules/dxos_model_factory.md).MutationWriteReceipt

## Hierarchy

- `WriteReceipt`

  ↳ **`MutationWriteReceipt`**

## Table of contents

### Properties

- [feedKey](dxos_model_factory.MutationWriteReceipt.md#feedkey)
- [seq](dxos_model_factory.MutationWriteReceipt.md#seq)

### Methods

- [waitToBeProcessed](dxos_model_factory.MutationWriteReceipt.md#waittobeprocessed)

## Properties

### feedKey

• **feedKey**: `PublicKey`

#### Inherited from

WriteReceipt.feedKey

#### Defined in

packages/echo/echo-protocol/dist/src/feeds/feed-writer.d.ts:7

___

### seq

• **seq**: `number`

#### Inherited from

WriteReceipt.seq

#### Defined in

packages/echo/echo-protocol/dist/src/feeds/feed-writer.d.ts:8

## Methods

### waitToBeProcessed

▸ **waitToBeProcessed**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/model-factory/src/types.ts:31](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/model-factory/src/types.ts#L31)

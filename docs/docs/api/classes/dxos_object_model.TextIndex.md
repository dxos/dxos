# Class: TextIndex

[@dxos/object-model](../modules/dxos_object_model.md).TextIndex

Caching text search.

## Constructors

### constructor

**new TextIndex**(`__namedParameters`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `IndexerOptions` |

#### Defined in

[packages/core/echo/object-model/src/text-index.ts:24](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/text-index.ts#L24)

## Properties

### \_cache

 `Private` `Readonly` **\_cache**: `Map`<`string`, `any`[]\>

#### Defined in

[packages/core/echo/object-model/src/text-index.ts:20](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/text-index.ts#L20)

___

### \_items

 `Private` **\_items**: `any`[] = `[]`

#### Defined in

[packages/core/echo/object-model/src/text-index.ts:22](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/text-index.ts#L22)

___

### \_minisearch

 `Private` `Readonly` **\_minisearch**: `MiniSearch`<`any`\>

#### Defined in

[packages/core/echo/object-model/src/text-index.ts:18](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/text-index.ts#L18)

## Methods

### search

**search**(`text`): `any`[]

#### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |

#### Returns

`any`[]

#### Defined in

[packages/core/echo/object-model/src/text-index.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/text-index.ts#L44)

___

### update

**update**(`items`): [`TextIndex`](dxos_object_model.TextIndex.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `items` | `any`[] |

#### Returns

[`TextIndex`](dxos_object_model.TextIndex.md)

#### Defined in

[packages/core/echo/object-model/src/text-index.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/echo/object-model/src/text-index.ts#L35)

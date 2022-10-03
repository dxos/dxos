# Class: OrderedList

[@dxos/client](../modules/dxos_client.md).OrderedList

Utility class that wraps an `ObjectModel` and implements a linked list via key-values on a given property.

## Constructors

### constructor

**new OrderedList**(`_model`, `_property?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_model` | [`ObjectModel`](dxos_client.ObjectModel.md) |
| `_property?` | `string` |

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:13

## Properties

### \_model

 `Private` `Readonly` **\_model**: `any`

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:8

___

### \_property

 `Private` `Readonly` **\_property**: `any`

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:9

___

### \_unsubscribe

 `Private` **\_unsubscribe**: `any`

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:12

___

### \_values

 `Private` **\_values**: `any`

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:10

___

### update

 **update**: `Event`<`string`[]\>

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:11

## Accessors

### id

`get` **id**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:14

___

### values

`get` **values**(): `string`[]

Get ordered values.

#### Returns

`string`[]

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:18

## Methods

### destroy

**destroy**(): `void`

#### Returns

`void`

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:19

___

### init

**init**(`values?`): `Promise`<`string`[]\>

Clears the ordered set with the optional values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `values?` | `string`[] |

#### Returns

`Promise`<`string`[]\>

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:27

___

### insert

**insert**(`left`, `right`): `Promise`<`string`[]\>

Links the ordered items, possibly linking them to existing items.

#### Parameters

| Name | Type |
| :------ | :------ |
| `left` | `string` |
| `right` | `string` |

#### Returns

`Promise`<`string`[]\>

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:31

___

### refresh

**refresh**(): [`OrderedList`](dxos_client.OrderedList.md)

Refresh list from properties.

#### Returns

[`OrderedList`](dxos_client.OrderedList.md)

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:23

___

### remove

**remove**(`values`): `Promise`<`string`[]\>

Removes the given element, possibly linked currently connected items.

#### Parameters

| Name | Type |
| :------ | :------ |
| `values` | `string`[] |

#### Returns

`Promise`<`string`[]\>

#### Defined in

packages/echo/object-model/dist/src/ordered-list.d.ts:35

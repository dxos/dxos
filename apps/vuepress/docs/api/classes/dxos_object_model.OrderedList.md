# Class: OrderedList

[@dxos/object-model](../modules/dxos_object_model.md).OrderedList

Utility class that wraps an `ObjectModel` and implements a linked list via key-values on a given property.

## Table of contents

### Constructors

- [constructor](dxos_object_model.OrderedList.md#constructor)

### Properties

- [\_unsubscribe](dxos_object_model.OrderedList.md#_unsubscribe)
- [\_values](dxos_object_model.OrderedList.md#_values)
- [update](dxos_object_model.OrderedList.md#update)

### Accessors

- [id](dxos_object_model.OrderedList.md#id)
- [values](dxos_object_model.OrderedList.md#values)

### Methods

- [destroy](dxos_object_model.OrderedList.md#destroy)
- [init](dxos_object_model.OrderedList.md#init)
- [insert](dxos_object_model.OrderedList.md#insert)
- [refresh](dxos_object_model.OrderedList.md#refresh)
- [remove](dxos_object_model.OrderedList.md#remove)

## Constructors

### constructor

• **new OrderedList**(`_model`, `_property?`)

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_model` | [`ObjectModel`](dxos_object_model.ObjectModel.md) | `undefined` |
| `_property` | `string` | `'order'` |

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:22](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L22)

## Properties

### \_unsubscribe

• `Private` **\_unsubscribe**: () => `void`

#### Type declaration

▸ (): `void`

##### Returns

`void`

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:20](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L20)

___

### \_values

• `Private` **\_values**: `string`[] = `[]`

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:16](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L16)

___

### update

• **update**: `Event`<`string`[]\>

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:18](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L18)

## Accessors

### id

• `get` **id**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L30)

___

### values

• `get` **values**(): `string`[]

Get ordered values.

#### Returns

`string`[]

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L37)

## Methods

### destroy

▸ **destroy**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L41)

___

### init

▸ **init**(`values?`): `Promise`<`string`[]\>

Clears the ordered set with the optional values.

#### Parameters

| Name | Type |
| :------ | :------ |
| `values?` | `string`[] |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:79](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L79)

___

### insert

▸ **insert**(`left`, `right`): `Promise`<`string`[]\>

Links the ordered items, possibly linking them to existing items.

#### Parameters

| Name | Type |
| :------ | :------ |
| `left` | `string` |
| `right` | `string` |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:104](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L104)

___

### refresh

▸ **refresh**(): [`OrderedList`](dxos_object_model.OrderedList.md)

Refresh list from properties.

#### Returns

[`OrderedList`](dxos_object_model.OrderedList.md)

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:49](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L49)

___

### remove

▸ **remove**(`values`): `Promise`<`string`[]\>

Removes the given element, possibly linked currently connected items.

#### Parameters

| Name | Type |
| :------ | :------ |
| `values` | `string`[] |

#### Returns

`Promise`<`string`[]\>

#### Defined in

[packages/echo/object-model/src/ordered-list.ts:134](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/object-model/src/ordered-list.ts#L134)

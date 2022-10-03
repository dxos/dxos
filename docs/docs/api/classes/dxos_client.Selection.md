# Class: Selection<T, R\>

[@dxos/client](../modules/dxos_client.md).Selection

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_client.Entity.md)<`any`\> |
| `R` | `void` |

## Constructors

### constructor

**new Selection**<`T`, `R`\>(`_visitor`, `_update`, `_root`, `_reducer?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_client.Entity.md)<`any`, `T`\> |
| `R` | `void` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_visitor` | (`options`: `QueryOptions`) => `SelectionContext`<`T`, `R`\> | Executes the query. |
| `_update` | `Event`<[`Entity`](dxos_client.Entity.md)<`Model`<`any`, `any`\>\>[]\> | The unfiltered update event. |
| `_root` | `SelectionRoot` | The root of the selection. Must be a stable reference. |
| `_reducer?` | `boolean` |  |

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:43

## Properties

### \_createSubSelection

 `Private` **\_createSubSelection**: `any`

Creates a derrived selection by aplying a mapping function to the result of the current selection.

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:47

___

### \_reducer

 `Private` `Readonly` **\_reducer**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:36

___

### \_root

 `Private` `Readonly` **\_root**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:35

___

### \_update

 `Private` `Readonly` **\_update**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:34

___

### \_visitor

 `Private` `Readonly` **\_visitor**: `any`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:33

## Accessors

### root

`get` **root**(): `SelectionRoot`

The root of the selection. Either a database or an item. Must be a stable reference.

#### Returns

`SelectionRoot`

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:59

## Methods

### call

**call**(`visitor`): [`Selection`](dxos_client.Selection.md)<`T`, `R`\>

Visitor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `visitor` | `Callable`<`T`, `R`\> |

#### Returns

[`Selection`](dxos_client.Selection.md)<`T`, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:64

___

### children

**children**(`this`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Select children of the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\> |
| `filter?` | `ItemFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:74

___

### exec

**exec**(`options?`): [`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `R`\>

Finish the selection and return the result.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `QueryOptions` |

#### Returns

[`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:51

___

### filter

**filter**(`this`, `filter`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Filter entities of this selection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\> | - |
| `filter` | `ItemFilter` | A filter object or a predicate function. |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:69

**filter**<`U`\>(`this`, `filter`): [`Selection`](dxos_client.Selection.md)<`U`, `R`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `U` | extends [`Entity`](dxos_client.Entity.md)<`Model`<`any`, `any`\>, `U`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<`U`, `R`\> |
| `filter` | `Predicate`<`U`\> |

#### Returns

[`Selection`](dxos_client.Selection.md)<`U`, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:70

___

### links

**links**(`this`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Link`](dxos_client.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

Select links sourcing from the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\> |
| `filter?` | `LinkFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Link`](dxos_client.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:82

___

### parent

**parent**(`this`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Select parent of the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\> |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:78

___

### query

**query**(`options?`): [`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `R`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `options?` | `QueryOptions` |

#### Returns

[`SelectionResult`](dxos_client.SelectionResult.md)<`T`, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:55

___

### refs

**refs**(`this`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Link`](dxos_client.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

Select links pointing to items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\> |
| `filter?` | `LinkFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Link`](dxos_client.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:86

___

### source

**source**(`this`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Select sources of links in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Link`](dxos_client.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\> |
| `filter?` | `ItemFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:94

___

### target

**target**(`this`, `filter?`): [`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

Select targets of links in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_client.Selection.md)<[`Link`](dxos_client.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\> |
| `filter?` | `ItemFilter` |

#### Returns

[`Selection`](dxos_client.Selection.md)<[`Item`](dxos_client.Item.md)<`any`\>, `R`\>

#### Defined in

packages/core/echo/echo-db/dist/src/packlets/database/selection/selection.d.ts:90

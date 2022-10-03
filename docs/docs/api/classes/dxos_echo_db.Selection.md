# Class: Selection<T, R\>

[@dxos/echo-db](../modules/dxos_echo_db.md).Selection

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_echo_db.Entity.md)<`any`\> |
| `R` | `void` |

## Constructors

### constructor

**new Selection**<`T`, `R`\>(`_visitor`, `_update`, `_root`, `_reducer?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](dxos_echo_db.Entity.md)<`any`, `T`\> |
| `R` | `void` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `_visitor` | (`options`: [`QueryOptions`](../types/dxos_echo_db.QueryOptions.md)) => [`SelectionContext`](../types/dxos_echo_db.SelectionContext.md)<`T`, `R`\> | `undefined` | Executes the query. |
| `_update` | `Event`<[`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\> | `undefined` | The unfiltered update event. |
| `_root` | [`SelectionRoot`](../types/dxos_echo_db.SelectionRoot.md) | `undefined` | The root of the selection. Must be a stable reference. |
| `_reducer` | `boolean` | `false` |  |

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:78](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L78)

## Accessors

### root

`get` **root**(): [`SelectionRoot`](../types/dxos_echo_db.SelectionRoot.md)

The root of the selection. Either a database or an item. Must be a stable reference.

#### Returns

[`SelectionRoot`](../types/dxos_echo_db.SelectionRoot.md)

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:112](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L112)

## Methods

### \_createSubSelection

`Private` **_createSubSelection**<`U`\>(`map`): [`Selection`](dxos_echo_db.Selection.md)<`U`, `R`\>

Creates a derrived selection by aplying a mapping function to the result of the current selection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `U` | extends [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>, `U`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `map` | (`context`: [`SelectionContext`](../types/dxos_echo_db.SelectionContext.md)<`T`, `R`\>, `options`: [`QueryOptions`](../types/dxos_echo_db.QueryOptions.md)) => [`SelectionContext`](../types/dxos_echo_db.SelectionContext.md)<`U`, `R`\> |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<`U`, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:88](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L88)

___

### call

**call**(`visitor`): [`Selection`](dxos_echo_db.Selection.md)<`T`, `R`\>

Visitor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `visitor` | [`Callable`](../types/dxos_echo_db.Callable.md)<`T`, `R`\> |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<`T`, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:120](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L120)

___

### children

**children**(`this`, `filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

Select children of the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\> |
| `filter?` | [`ItemFilter`](../types/dxos_echo_db.ItemFilter.md) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:138](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L138)

___

### exec

**exec**(`options?`): [`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `R`\>

Finish the selection and return the result.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`QueryOptions`](../types/dxos_echo_db.QueryOptions.md) |

#### Returns

[`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:97](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L97)

___

### filter

**filter**(`this`, `filter`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

Filter entities of this selection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\> | - |
| `filter` | [`ItemFilter`](../types/dxos_echo_db.ItemFilter.md) | A filter object or a predicate function. |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:128](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L128)

**filter**<`U`\>(`this`, `filter`): [`Selection`](dxos_echo_db.Selection.md)<`U`, `R`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `U` | extends [`Entity`](dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>, `U`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<`U`, `R`\> |
| `filter` | [`Predicate`](../types/dxos_echo_db.Predicate.md)<`U`\> |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<`U`, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:129](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L129)

___

### links

**links**(`this`, `filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

Select links sourcing from the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\> |
| `filter` | [`LinkFilter`](../types/dxos_echo_db.LinkFilter.md) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:162](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L162)

___

### parent

**parent**(`this`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

Select parent of the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\> |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:152](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L152)

___

### query

**query**(`options?`): [`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `R`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`QueryOptions`](../types/dxos_echo_db.QueryOptions.md) |

#### Returns

[`SelectionResult`](dxos_echo_db.SelectionResult.md)<`T`, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:105](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L105)

___

### refs

**refs**(`this`, `filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

Select links pointing to items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\> |
| `filter` | [`LinkFilter`](../types/dxos_echo_db.LinkFilter.md) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:173](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L173)

___

### source

**source**(`this`, `filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

Select sources of links in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\> |
| `filter` | [`ItemFilter`](../types/dxos_echo_db.ItemFilter.md) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:195](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L195)

___

### target

**target**(`this`, `filter?`): [`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

Select targets of links in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](dxos_echo_db.Selection.md)<[`Link`](dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\> |
| `filter` | [`ItemFilter`](../types/dxos_echo_db.ItemFilter.md) |

#### Returns

[`Selection`](dxos_echo_db.Selection.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/database/selection/selection.ts:184](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/database/selection/selection.ts#L184)

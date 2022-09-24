# Class: Selection<T, R\>

Selections are used to construct database subscriptions.
They are [monads](https://www.quora.com/What-are-monads-in-computer-science) that support
the functional composition of predicates to traverse the graph.
Additionally, selections may be used to create reducers that compute an aggregated value over the traversal.

Implementation:
Each Selection contains a visitor

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](Entity.md)<`any`\> |
| `R` | `void` |

## Table of contents

### Constructors

- [constructor](Selection.md#constructor)

### Accessors

- [root](Selection.md#root)

### Methods

- [\_createSubSelection](Selection.md#_createsubselection)
- [call](Selection.md#call)
- [children](Selection.md#children)
- [exec](Selection.md#exec)
- [filter](Selection.md#filter)
- [links](Selection.md#links)
- [parent](Selection.md#parent)
- [query](Selection.md#query)
- [refs](Selection.md#refs)
- [source](Selection.md#source)
- [target](Selection.md#target)

## Constructors

### constructor

• **new Selection**<`T`, `R`\>(`_visitor`, `_update`, `_root`, `_reducer?`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](Entity.md)<`any`, `T`\> |
| `R` | `void` |

#### Parameters

| Name | Type | Default value | Description |
| :------ | :------ | :------ | :------ |
| `_visitor` | (`options`: [`QueryOptions`](../modules.md#queryoptions)) => [`SelectionContext`](../modules.md#selectioncontext)<`T`, `R`\> | `undefined` | Executes the query. |
| `_update` | `Event`<[`Entity`](Entity.md)<`Model`<`any`, `any`\>\>[]\> | `undefined` | The unfiltered update event. |
| `_root` | [`SelectionRoot`](../modules.md#selectionroot) | `undefined` | The root of the selection. Must be a stable reference. |
| `_reducer` | `boolean` | `false` |  |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:78](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L78)

## Accessors

### root

• `get` **root**(): [`SelectionRoot`](../modules.md#selectionroot)

The root of the selection. Either a database or an item. Must be a stable reference.

#### Returns

[`SelectionRoot`](../modules.md#selectionroot)

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:112](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L112)

## Methods

### \_createSubSelection

▸ `Private` **_createSubSelection**<`U`\>(`map`): [`Selection`](Selection.md)<`U`, `R`\>

Creates a derrived selection by aplying a mapping function to the result of the current selection.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `U` | extends [`Entity`](Entity.md)<`Model`<`any`, `any`\>, `U`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `map` | (`context`: [`SelectionContext`](../modules.md#selectioncontext)<`T`, `R`\>, `options`: [`QueryOptions`](../modules.md#queryoptions)) => [`SelectionContext`](../modules.md#selectioncontext)<`U`, `R`\> |

#### Returns

[`Selection`](Selection.md)<`U`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:88](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L88)

___

### call

▸ **call**(`visitor`): [`Selection`](Selection.md)<`T`, `R`\>

Visitor.

#### Parameters

| Name | Type |
| :------ | :------ |
| `visitor` | [`Callable`](../modules.md#callable)<`T`, `R`\> |

#### Returns

[`Selection`](Selection.md)<`T`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:120](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L120)

___

### children

▸ **children**(`this`, `filter?`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

Select children of the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\> |
| `filter?` | [`ItemFilter`](../modules.md#itemfilter) |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:138](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L138)

___

### exec

▸ **exec**(`options?`): [`SelectionResult`](SelectionResult.md)<`T`, `R`\>

Finish the selection and return the result.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`QueryOptions`](../modules.md#queryoptions) |

#### Returns

[`SelectionResult`](SelectionResult.md)<`T`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:97](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L97)

___

### filter

▸ **filter**(`this`, `filter`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

Filter entities of this selection.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\> | - |
| `filter` | [`ItemFilter`](../modules.md#itemfilter) | A filter object or a predicate function. |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:128](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L128)

▸ **filter**<`U`\>(`this`, `filter`): [`Selection`](Selection.md)<`U`, `R`\>

#### Type parameters

| Name | Type |
| :------ | :------ |
| `U` | extends [`Entity`](Entity.md)<`Model`<`any`, `any`\>, `U`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<`U`, `R`\> |
| `filter` | [`Predicate`](../modules.md#predicate)<`U`\> |

#### Returns

[`Selection`](Selection.md)<`U`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:129](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L129)

___

### links

▸ **links**(`this`, `filter?`): [`Selection`](Selection.md)<[`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

Select links sourcing from the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\> |
| `filter` | [`LinkFilter`](../modules.md#linkfilter) |

#### Returns

[`Selection`](Selection.md)<[`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:162](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L162)

___

### parent

▸ **parent**(`this`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

Select parent of the items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\> |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:152](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L152)

___

### query

▸ **query**(`options?`): [`SelectionResult`](SelectionResult.md)<`T`, `R`\>

**`Deprecated`**

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`QueryOptions`](../modules.md#queryoptions) |

#### Returns

[`SelectionResult`](SelectionResult.md)<`T`, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:105](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L105)

___

### refs

▸ **refs**(`this`, `filter?`): [`Selection`](Selection.md)<[`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

Select links pointing to items in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\> |
| `filter` | [`LinkFilter`](../modules.md#linkfilter) |

#### Returns

[`Selection`](Selection.md)<[`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:173](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L173)

___

### source

▸ **source**(`this`, `filter?`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

Select sources of links in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\> |
| `filter` | [`ItemFilter`](../modules.md#itemfilter) |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:195](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L195)

___

### target

▸ **target**(`this`, `filter?`): [`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

Select targets of links in this selection.

#### Parameters

| Name | Type |
| :------ | :------ |
| `this` | [`Selection`](Selection.md)<[`Link`](Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>, `R`\> |
| `filter` | [`ItemFilter`](../modules.md#itemfilter) |

#### Returns

[`Selection`](Selection.md)<[`Item`](Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:184](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L184)

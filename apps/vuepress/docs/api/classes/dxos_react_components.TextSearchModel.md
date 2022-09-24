# Class: TextSearchModel<T\>

[@dxos/react-components](../modules/dxos_react_components.md).TextSearchModel

Simple text search model.

## Type parameters

| Name |
| :------ |
| `T` |

## Implements

- [`SearchModel`](../interfaces/dxos_react_components.SearchModel.md)<`T`\>

## Table of contents

### Constructors

- [constructor](dxos_react_components.TextSearchModel.md#constructor)

### Properties

- [\_results](dxos_react_components.TextSearchModel.md#_results)
- [\_timeout](dxos_react_components.TextSearchModel.md#_timeout)
- [\_update](dxos_react_components.TextSearchModel.md#_update)

### Accessors

- [results](dxos_react_components.TextSearchModel.md#results)

### Methods

- [setText](dxos_react_components.TextSearchModel.md#settext)
- [subscribe](dxos_react_components.TextSearchModel.md#subscribe)

## Constructors

### constructor

• **new TextSearchModel**<`T`\>(`_values`, `_delay?`)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_values` | [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[] | `undefined` |
| `_delay` | `number` | `500` |

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:37](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L37)

## Properties

### \_results

• **\_results**: [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[] = `[]`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L34)

___

### \_timeout

• `Optional` **\_timeout**: `Timeout`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:35](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L35)

___

### \_update

• **\_update**: `Event`<[`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]\>

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L33)

## Accessors

### results

• `get` **results**(): [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]

#### Returns

[`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]

#### Implementation of

[SearchModel](../interfaces/dxos_react_components.SearchModel.md).[results](../interfaces/dxos_react_components.SearchModel.md#results)

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:42](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L42)

## Methods

### setText

▸ **setText**(`text`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |

#### Returns

`void`

#### Implementation of

SearchModel.setText

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:50](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L50)

___

### subscribe

▸ **subscribe**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`results`: [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]) => `void` |

#### Returns

`fn`

▸ (): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Implementation of

SearchModel.subscribe

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:46](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L46)

# Class: TextSearchModel<T\>

[@dxos/react-components](../modules/dxos_react_components.md).TextSearchModel

Simple text search model.

## Type parameters

| Name |
| :------ |
| `T` |

## Implements

- [`SearchModel`](../interfaces/dxos_react_components.SearchModel.md)<`T`\>

## Constructors

### constructor

**new TextSearchModel**<`T`\>(`_values`, `_delay?`)

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `_values` | [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[] | `undefined` |
| `_delay` | `number` | `500` |

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:37](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L37)

## Properties

### \_results

 **\_results**: [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[] = `[]`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:34](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L34)

___

### \_timeout

 `Optional` **\_timeout**: `Timeout`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:35](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L35)

___

### \_update

 **\_update**: `Event`<[`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]\>

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:33](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L33)

## Accessors

### results

`get` **results**(): [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]

#### Returns

[`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]

#### Implementation of

[SearchModel](../interfaces/dxos_react_components.SearchModel.md).[results](../interfaces/dxos_react_components.SearchModel.md#results)

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:42](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L42)

## Methods

### setText

**setText**(`text`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |

#### Returns

`void`

#### Implementation of

SearchModel.setText

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:50](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L50)

___

### subscribe

**subscribe**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`results`: [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]) => `void` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Implementation of

SearchModel.subscribe

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:46](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L46)

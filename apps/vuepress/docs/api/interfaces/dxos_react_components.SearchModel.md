# Interface: SearchModel<T\>

[@dxos/react-components](../modules/dxos_react_components.md).SearchModel

Text search interface.

## Type parameters

| Name |
| :------ |
| `T` |

## Implemented by

- [`TextSearchModel`](../classes/dxos_react_components.TextSearchModel.md)

## Table of contents

### Properties

- [results](dxos_react_components.SearchModel.md#results)
- [setText](dxos_react_components.SearchModel.md#settext)
- [subscribe](dxos_react_components.SearchModel.md#subscribe)

## Properties

### results

• **results**: [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L20)

___

### setText

• **setText**: (`text`: `string`) => `void`

#### Type declaration

▸ (`text`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L26)

___

### subscribe

• **subscribe**: (`callback`: (`results`: [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]) => `void`) => `void`

#### Type declaration

▸ (`callback`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`results`: [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>[]) => `void` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L23)

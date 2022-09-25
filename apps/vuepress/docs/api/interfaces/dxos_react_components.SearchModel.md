# Interface: SearchModel<T\>

[@dxos/react-components](../modules/dxos_react_components.md).SearchModel

Text search interface.

## Type parameters

| Name |
| :------ |
| `T` |

## Implemented by

- [`TextSearchModel`](../classes/dxos_react_components.TextSearchModel.md)

## Properties

### results

 **results**: [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:20](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L20)

___

### setText

 **setText**: (`text`: `string`) => `void`

#### Type declaration

(`text`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `text` | `string` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:26](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L26)

___

### subscribe

 **subscribe**: (`callback`: (`results`: [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]) => `void`) => `void`

#### Type declaration

(`callback`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`results`: [`SearchResult`](../types/dxos_react_components.SearchResult.md)<`T`\>[]) => `void` |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts:23](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/react-components/src/SearchAutocomplete/SearchModel.ts#L23)

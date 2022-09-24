# Interface: SearchAutocompleteProps<T\>

[@dxos/react-components](../modules/dxos_react_components.md).SearchAutocompleteProps

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Properties

- [clearOnSelect](dxos_react_components.SearchAutocompleteProps.md#clearonselect)
- [groupBy](dxos_react_components.SearchAutocompleteProps.md#groupby)
- [model](dxos_react_components.SearchAutocompleteProps.md#model)
- [onSelect](dxos_react_components.SearchAutocompleteProps.md#onselect)

## Properties

### clearOnSelect

• `Optional` **clearOnSelect**: `boolean`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx:13](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx#L13)

___

### groupBy

• `Optional` **groupBy**: `string`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx:15](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx#L15)

___

### model

• **model**: [`SearchModel`](dxos_react_components.SearchModel.md)<`T`\>

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx:12](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx#L12)

___

### onSelect

• **onSelect**: (`value`: [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\>) => `void`

#### Type declaration

▸ (`value`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `value` | [`SearchResult`](../modules/dxos_react_components.md#searchresult)<`T`\> |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx:14](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-components/src/SearchAutocomplete/SearchAutocomplete.tsx#L14)

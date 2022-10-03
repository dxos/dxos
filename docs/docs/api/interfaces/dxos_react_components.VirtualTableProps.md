# Interface: VirtualTableProps<T\>

[@dxos/react-components](../modules/dxos_react_components.md).VirtualTableProps

## Type parameters

| Name |
| :------ |
| `T` |

## Properties

### columns

 **columns**: `Column`[]

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:302](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L302)

___

### getRowHeight

 `Optional` **getRowHeight**: (`props`: [`GetRowHeightProps`](dxos_react_components.GetRowHeightProps.md)) => `number`

#### Type declaration

(`props`): `number`

##### Parameters

| Name | Type |
| :------ | :------ |
| `props` | [`GetRowHeightProps`](dxos_react_components.GetRowHeightProps.md) |

##### Returns

`number`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:304](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L304)

___

### getRowKey

 **getRowKey**: (`row`: [`RowData`](../types/dxos_react_components.RowData.md)) => `string`

#### Type declaration

(`row`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `row` | [`RowData`](../types/dxos_react_components.RowData.md) |

##### Returns

`string`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:303](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L303)

___

### getValue

 `Optional` **getValue**: (`data`: [`RowData`](../types/dxos_react_components.RowData.md), `key`: `string`) => `any`

#### Type declaration

(`data`, `key`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`RowData`](../types/dxos_react_components.RowData.md) |
| `key` | `string` |

##### Returns

`any`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:305](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L305)

___

### onSelect

 `Optional` **onSelect**: (`selected`: [`SelectionModel`](../types/dxos_react_components.SelectionModel.md)) => `void`

#### Type declaration

(`selected`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `selected` | [`SelectionModel`](../types/dxos_react_components.SelectionModel.md) |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:301](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L301)

___

### renderCell

 `Optional` **renderCell**: (`props`: [`DataCellProps`](dxos_react_components.DataCellProps.md)) => `undefined` \| `Element`

#### Type declaration

(`props`): `undefined` \| `Element`

##### Parameters

| Name | Type |
| :------ | :------ |
| `props` | [`DataCellProps`](dxos_react_components.DataCellProps.md) |

##### Returns

`undefined` \| `Element`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:306](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L306)

___

### rows

 `Optional` **rows**: `T`[]

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:299](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L299)

___

### selected

 `Optional` **selected**: [`SelectionModel`](../types/dxos_react_components.SelectionModel.md)

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:300](https://github.com/dxos/dxos/blob/main/packages/sdk/react-components/src/VirtualTable.tsx#L300)

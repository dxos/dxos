# Interface: VirtualTableProps<T\>

[@dxos/react-components](../modules/dxos_react_components.md).VirtualTableProps

## Type parameters

| Name |
| :------ |
| `T` |

## Table of contents

### Properties

- [columns](dxos_react_components.VirtualTableProps.md#columns)
- [getRowHeight](dxos_react_components.VirtualTableProps.md#getrowheight)
- [getRowKey](dxos_react_components.VirtualTableProps.md#getrowkey)
- [getValue](dxos_react_components.VirtualTableProps.md#getvalue)
- [onSelect](dxos_react_components.VirtualTableProps.md#onselect)
- [renderCell](dxos_react_components.VirtualTableProps.md#rendercell)
- [rows](dxos_react_components.VirtualTableProps.md#rows)
- [selected](dxos_react_components.VirtualTableProps.md#selected)

## Properties

### columns

• **columns**: `Column`[]

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:302](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L302)

___

### getRowHeight

• `Optional` **getRowHeight**: (`props`: [`GetRowHeightProps`](dxos_react_components.GetRowHeightProps.md)) => `number`

#### Type declaration

▸ (`props`): `number`

##### Parameters

| Name | Type |
| :------ | :------ |
| `props` | [`GetRowHeightProps`](dxos_react_components.GetRowHeightProps.md) |

##### Returns

`number`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:304](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L304)

___

### getRowKey

• **getRowKey**: (`row`: [`RowData`](../modules/dxos_react_components.md#rowdata)) => `string`

#### Type declaration

▸ (`row`): `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `row` | [`RowData`](../modules/dxos_react_components.md#rowdata) |

##### Returns

`string`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:303](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L303)

___

### getValue

• `Optional` **getValue**: (`data`: [`RowData`](../modules/dxos_react_components.md#rowdata), `key`: `string`) => `any`

#### Type declaration

▸ (`data`, `key`): `any`

##### Parameters

| Name | Type |
| :------ | :------ |
| `data` | [`RowData`](../modules/dxos_react_components.md#rowdata) |
| `key` | `string` |

##### Returns

`any`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:305](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L305)

___

### onSelect

• `Optional` **onSelect**: (`selected`: [`SelectionModel`](../modules/dxos_react_components.md#selectionmodel)) => `void`

#### Type declaration

▸ (`selected`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `selected` | [`SelectionModel`](../modules/dxos_react_components.md#selectionmodel) |

##### Returns

`void`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:301](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L301)

___

### renderCell

• `Optional` **renderCell**: (`props`: [`DataCellProps`](dxos_react_components.DataCellProps.md)) => `undefined` \| `Element`

#### Type declaration

▸ (`props`): `undefined` \| `Element`

##### Parameters

| Name | Type |
| :------ | :------ |
| `props` | [`DataCellProps`](dxos_react_components.DataCellProps.md) |

##### Returns

`undefined` \| `Element`

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:306](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L306)

___

### rows

• `Optional` **rows**: `T`[]

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:299](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L299)

___

### selected

• `Optional` **selected**: [`SelectionModel`](../modules/dxos_react_components.md#selectionmodel)

#### Defined in

[packages/sdk/react-components/src/VirtualTable.tsx:300](https://github.com/dxos/dxos/blob/32ae9b579/packages/sdk/react-components/src/VirtualTable.tsx#L300)

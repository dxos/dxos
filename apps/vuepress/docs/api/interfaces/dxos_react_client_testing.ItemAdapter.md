# Interface: ItemAdapter

[@dxos/react-client-testing](../modules/dxos_react_client_testing.md).ItemAdapter

## Table of contents

### Properties

- [description](dxos_react_client_testing.ItemAdapter.md#description)
- [linkedItems](dxos_react_client_testing.ItemAdapter.md#linkeditems)
- [linkedTypes](dxos_react_client_testing.ItemAdapter.md#linkedtypes)
- [meta](dxos_react_client_testing.ItemAdapter.md#meta)
- [title](dxos_react_client_testing.ItemAdapter.md#title)

## Properties

### description

• **description**: (`item`: `Item`<`ObjectModel`\>) => `undefined` \| `string`

#### Type declaration

▸ (`item`): `undefined` \| `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `Item`<`ObjectModel`\> |

##### Returns

`undefined` \| `string`

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-client-testing/src/adapter.ts#L60)

___

### linkedItems

• `Optional` **linkedItems**: (`item`: `Item`<`ObjectModel`\>, `kind`: `string`) => `Item`<`ObjectModel`\>[]

#### Type declaration

▸ (`item`, `kind`): `Item`<`ObjectModel`\>[]

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `Item`<`ObjectModel`\> |
| `kind` | `string` |

##### Returns

`Item`<`ObjectModel`\>[]

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:62](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-client-testing/src/adapter.ts#L62)

___

### linkedTypes

• `Optional` **linkedTypes**: (`item`: `Item`<`ObjectModel`\>) => `string`[]

#### Type declaration

▸ (`item`): `string`[]

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `Item`<`ObjectModel`\> |

##### Returns

`string`[]

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:61](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-client-testing/src/adapter.ts#L61)

___

### meta

• `Optional` **meta**: (`type`: `string`) => `undefined` \| [`ItemMeta`](../modules/dxos_react_client_testing.md#itemmeta)

#### Type declaration

▸ (`type`): `undefined` \| [`ItemMeta`](../modules/dxos_react_client_testing.md#itemmeta)

##### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `string` |

##### Returns

`undefined` \| [`ItemMeta`](../modules/dxos_react_client_testing.md#itemmeta)

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:63](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-client-testing/src/adapter.ts#L63)

___

### title

• **title**: (`item`: `Item`<`ObjectModel`\>) => `undefined` \| `string`

#### Type declaration

▸ (`item`): `undefined` \| `string`

##### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `Item`<`ObjectModel`\> |

##### Returns

`undefined` \| `string`

#### Defined in

[packages/sdk/react-client-testing/src/adapter.ts:59](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-client-testing/src/adapter.ts#L59)

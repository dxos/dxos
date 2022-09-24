# Module: @dxos/react-echo-graph

## Table of contents

### Classes

- [EchoGraphModel](../classes/dxos_react_echo_graph.EchoGraphModel.md)

### Interfaces

- [EchoGraphProps](../interfaces/dxos_react_echo_graph.EchoGraphProps.md)

### Functions

- [EchoGraph](dxos_react_echo_graph.md#echograph)
- [useGraphModel](dxos_react_echo_graph.md#usegraphmodel)

## Functions

### EchoGraph

▸ **EchoGraph**(`__namedParameters`): `Element`

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`EchoGraphProps`](../interfaces/dxos_react_echo_graph.EchoGraphProps.md) |

#### Returns

`Element`

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/EchoGraph.tsx:28](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-echo-graph/src/components/EchoGraph/EchoGraph.tsx#L28)

___

### useGraphModel

▸ **useGraphModel**(`party?`, `filters?`): [`EchoGraphModel`](../classes/dxos_react_echo_graph.EchoGraphModel.md)

Create model.

#### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `party?` | `Party` | `undefined` |
| `filters` | (`item`: `Item`<`any`\>) => `boolean`[] | `[]` |

#### Returns

[`EchoGraphModel`](../classes/dxos_react_echo_graph.EchoGraphModel.md)

#### Defined in

[packages/sdk/react-echo-graph/src/hooks/useGraphModel.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/sdk/react-echo-graph/src/hooks/useGraphModel.ts#L16)

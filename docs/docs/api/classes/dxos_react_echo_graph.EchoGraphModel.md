# Class: EchoGraphModel

[@dxos/react-echo-graph](../modules/dxos_react_echo_graph.md).EchoGraphModel

ECHO adapter for the Graph model.

## Implements

- `GraphModel`<`Item`<`any`\>\>

## Constructors

### constructor

**new EchoGraphModel**()

## Properties

### \_graph

 `Private` `Readonly` **\_graph**: `GraphData`<`Item`<`any`\>\>

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts:15](https://github.com/dxos/dxos/blob/main/packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts#L15)

___

### updated

 `Readonly` **updated**: `Event`<`GraphData`<`Item`<`any`\>\>\>

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts:13](https://github.com/dxos/dxos/blob/main/packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts#L13)

## Accessors

### graph

`get` **graph**(): `GraphData`<`Item`<`any`\>\>

#### Returns

`GraphData`<`Item`<`any`\>\>

#### Implementation of

GraphModel.graph

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts:20](https://github.com/dxos/dxos/blob/main/packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts#L20)

## Methods

### refresh

**refresh**(): `void`

#### Returns

`void`

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts:28](https://github.com/dxos/dxos/blob/main/packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts#L28)

___

### subscribe

**subscribe**(`callback`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `callback` | (`graph`: `GraphData`<`Item`<`any`\>\>) => `void` |

#### Returns

`fn`

(): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Implementation of

GraphModel.subscribe

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts:24](https://github.com/dxos/dxos/blob/main/packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts#L24)

___

### update

**update**(`items`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `items` | `Item`<`any`\>[] |

#### Returns

`void`

#### Defined in

[packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts:32](https://github.com/dxos/dxos/blob/main/packages/sdk/react-echo-graph/src/components/EchoGraph/model.ts#L32)

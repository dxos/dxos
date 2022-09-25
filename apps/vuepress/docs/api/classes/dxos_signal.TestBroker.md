# Class: TestBroker

[@dxos/signal](../modules/dxos_signal.md).TestBroker

## Constructors

### constructor

**new TestBroker**(`__namedParameters?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `TestBrokerOptions` |

#### Defined in

[packages/mesh/signal/src/test-broker.ts:30](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L30)

## Properties

### \_binPath

 `Private` `Readonly` **\_binPath**: `string`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:23](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L23)

___

### \_port

 `Private` `Readonly` **\_port**: `number`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:26](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L26)

___

### \_retriesLimit

 `Private` `Readonly` **\_retriesLimit**: ``3``

#### Defined in

[packages/mesh/signal/src/test-broker.ts:25](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L25)

___

### \_serverProcess

 `Private` **\_serverProcess**: `ChildProcessWithoutNullStreams`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:28](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L28)

___

### \_startRetries

 `Private` **\_startRetries**: `number` = `0`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:24](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L24)

___

### \_timeout

 `Private` `Readonly` **\_timeout**: `number`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:27](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L27)

## Methods

### startProcess

**startProcess**(): `ChildProcessWithoutNullStreams`

#### Returns

`ChildProcessWithoutNullStreams`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:36](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L36)

___

### stop

**stop**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:97](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L97)

___

### url

**url**(): `string`

#### Returns

`string`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:101](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L101)

___

### waitUntilStarted

**waitUntilStarted**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/signal/src/test-broker.ts:73](https://github.com/dxos/dxos/blob/db8188dae/packages/mesh/signal/src/test-broker.ts#L73)

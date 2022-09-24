# Class: TestBroker

[@dxos/signal](../modules/dxos_signal.md).TestBroker

## Table of contents

### Constructors

- [constructor](dxos_signal.TestBroker.md#constructor)

### Properties

- [\_binPath](dxos_signal.TestBroker.md#_binpath)
- [\_port](dxos_signal.TestBroker.md#_port)
- [\_retriesLimit](dxos_signal.TestBroker.md#_retrieslimit)
- [\_serverProcess](dxos_signal.TestBroker.md#_serverprocess)
- [\_startRetries](dxos_signal.TestBroker.md#_startretries)
- [\_timeout](dxos_signal.TestBroker.md#_timeout)

### Methods

- [startProcess](dxos_signal.TestBroker.md#startprocess)
- [stop](dxos_signal.TestBroker.md#stop)
- [url](dxos_signal.TestBroker.md#url)
- [waitUntilStarted](dxos_signal.TestBroker.md#waituntilstarted)

## Constructors

### constructor

• **new TestBroker**(`__namedParameters?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `TestBrokerOptions` |

#### Defined in

[packages/mesh/signal/src/test-broker.ts:30](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L30)

## Properties

### \_binPath

• `Private` `Readonly` **\_binPath**: `string`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L23)

___

### \_port

• `Private` `Readonly` **\_port**: `number`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L26)

___

### \_retriesLimit

• `Private` `Readonly` **\_retriesLimit**: ``3``

#### Defined in

[packages/mesh/signal/src/test-broker.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L25)

___

### \_serverProcess

• `Private` **\_serverProcess**: `ChildProcessWithoutNullStreams`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L28)

___

### \_startRetries

• `Private` **\_startRetries**: `number` = `0`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:24](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L24)

___

### \_timeout

• `Private` `Readonly` **\_timeout**: `number`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:27](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L27)

## Methods

### startProcess

▸ **startProcess**(): `ChildProcessWithoutNullStreams`

#### Returns

`ChildProcessWithoutNullStreams`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:36](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L36)

___

### stop

▸ **stop**(): `void`

#### Returns

`void`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:97](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L97)

___

### url

▸ **url**(): `string`

#### Returns

`string`

#### Defined in

[packages/mesh/signal/src/test-broker.ts:101](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L101)

___

### waitUntilStarted

▸ **waitUntilStarted**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/signal/src/test-broker.ts:73](https://github.com/dxos/dxos/blob/e3b936721/packages/mesh/signal/src/test-broker.ts#L73)

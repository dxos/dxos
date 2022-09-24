# Module: @dxos/signal

## Table of contents

### Classes

- [TestBroker](../classes/dxos_signal.TestBroker.md)

### Functions

- [createTestBroker](dxos_signal.md#createtestbroker)

## Functions

### createTestBroker

▸ **createTestBroker**(`port?`): `Promise`<[`TestBroker`](../classes/dxos_signal.TestBroker.md)\>

Creates a test instance of the signal server with swarming disabled and starts it.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `port?` | `number` | Port to start the signal server on, random by default. |

#### Returns

`Promise`<[`TestBroker`](../classes/dxos_signal.TestBroker.md)\>

#### Defined in

[packages/mesh/signal/src/test-broker.ts:111](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/signal/src/test-broker.ts#L111)

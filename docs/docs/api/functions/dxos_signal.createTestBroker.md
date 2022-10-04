# Function: createTestBroker

[@dxos/signal](../modules/dxos_signal.md).createTestBroker

**createTestBroker**(`port?`): `Promise`<[`TestBroker`](../classes/dxos_signal.TestBroker.md)\>

Creates a test instance of the signal server with swarming disabled and starts it.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `port?` | `number` | Port to start the signal server on, random by default. |

#### Returns

`Promise`<[`TestBroker`](../classes/dxos_signal.TestBroker.md)\>

#### Defined in

[packages/core/mesh/signal/src/test-broker.ts:111](https://github.com/dxos/dxos/blob/main/packages/core/mesh/signal/src/test-broker.ts#L111)

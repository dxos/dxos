# Module: @dxos/messaging

## Table of contents

### Enumerations

- [SignalState](../enums/dxos_messaging.SignalState.md)

### Classes

- [MemorySignalManager](../classes/dxos_messaging.MemorySignalManager.md)
- [MemorySignalManagerContext](../classes/dxos_messaging.MemorySignalManagerContext.md)
- [Messenger](../classes/dxos_messaging.Messenger.md)
- [SignalClient](../classes/dxos_messaging.SignalClient.md)
- [WebsocketSignalManager](../classes/dxos_messaging.WebsocketSignalManager.md)

### Interfaces

- [ListeningHandle](../interfaces/dxos_messaging.ListeningHandle.md)
- [MessengerOptions](../interfaces/dxos_messaging.MessengerOptions.md)
- [SignalManager](../interfaces/dxos_messaging.SignalManager.md)

### Type Aliases

- [CommandTrace](dxos_messaging.md#commandtrace)
- [OnMessage](dxos_messaging.md#onmessage)
- [SignalStatus](dxos_messaging.md#signalstatus)

## Type Aliases

### CommandTrace

Ƭ **CommandTrace**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `error?` | `string` |
| `host` | `string` |
| `incoming` | `boolean` |
| `messageId` | `string` |
| `method` | `string` |
| `payload` | `any` |
| `response?` | `any` |
| `time` | `number` |

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L45)

___

### OnMessage

Ƭ **OnMessage**: (`params`: { `author`: `PublicKey` ; `payload`: `Any` ; `recipient`: `PublicKey`  }) => `Promise`<`void`\>

#### Type declaration

▸ (`params`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `params` | `Object` |
| `params.author` | `PublicKey` |
| `params.payload` | `Any` |
| `params.recipient` | `PublicKey` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/mesh/messaging/src/messenger.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/messenger.ts#L21)

___

### SignalStatus

Ƭ **SignalStatus**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `connectionStarted` | `number` |
| `error?` | `string` |
| `host` | `string` |
| `lastStateChange` | `number` |
| `reconnectIn` | `number` |
| `state` | [`SignalState`](../enums/dxos_messaging.SignalState.md) |

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L36)

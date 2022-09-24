# Enumeration: SignalState

[@dxos/messaging](../modules/dxos_messaging.md).SignalState

## Table of contents

### Enumeration Members

- [CLOSED](dxos_messaging.SignalState.md#closed)
- [CONNECTED](dxos_messaging.SignalState.md#connected)
- [CONNECTING](dxos_messaging.SignalState.md#connecting)
- [DISCONNECTED](dxos_messaging.SignalState.md#disconnected)
- [RE\_CONNECTING](dxos_messaging.SignalState.md#re_connecting)

## Enumeration Members

### CLOSED

• **CLOSED** = ``"CLOSED"``

Socket was closed.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:33](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L33)

___

### CONNECTED

• **CONNECTED** = ``"CONNECTED"``

Connected.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:27](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L27)

___

### CONNECTING

• **CONNECTING** = ``"CONNECTING"``

Connection is being established.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:21](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L21)

___

### DISCONNECTED

• **DISCONNECTED** = ``"DISCONNECTED"``

Server terminated the connection. Socket will be reconnected.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:30](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L30)

___

### RE\_CONNECTING

• **RE\_CONNECTING** = ``"RE_CONNECTING"``

Connection is being re-established.

#### Defined in

[packages/mesh/messaging/src/signal-client.ts:24](https://github.com/dxos/dxos/blob/32ae9b579/packages/mesh/messaging/src/signal-client.ts#L24)

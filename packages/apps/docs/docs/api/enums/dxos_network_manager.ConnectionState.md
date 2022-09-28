# Enumeration: ConnectionState

[@dxos/network-manager](../modules/dxos_network_manager.md).ConnectionState

State machine for each connection.

## Enumeration Members

### ACCEPTED

 **ACCEPTED** = ``"ACCEPTED"``

Peer rejected offer.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:39](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L39)

___

### CLOSED

 **CLOSED** = ``"CLOSED"``

Connection closed.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:54](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L54)

___

### CONNECTED

 **CONNECTED** = ``"CONNECTED"``

Connection is established.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:49](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L49)

___

### INITIAL

 **INITIAL** = ``"INITIAL"``

Initial state. Connection is registered but no attempt to connect to the remote peer has been performed. Might mean that we are waiting for the answer signal from the remote peer.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:24](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L24)

___

### INITIATING\_CONNECTION

 **INITIATING\_CONNECTION** = ``"INITIATING_CONNECTION"``

Originating a connection.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:29](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L29)

___

### REJECTED

 **REJECTED** = ``"REJECTED"``

Peer rejected offer.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:44](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L44)

___

### WAITING\_FOR\_CONNECTION

 **WAITING\_FOR\_CONNECTION** = ``"WAITING_FOR_CONNECTION"``

Waiting for a connection to be originated from the remote peer.

#### Defined in

[packages/mesh/network-manager/src/swarm/connection.ts:34](https://github.com/dxos/dxos/blob/main/packages/mesh/network-manager/src/swarm/connection.ts#L34)

# Class: MemorySignalManagerContext

[@dxos/messaging](../modules/dxos_messaging.md).MemorySignalManagerContext

Common signaling context that connects multiple MemorySignalManager instances.

## Constructors

### constructor

**new MemorySignalManagerContext**()

## Properties

### connections

 `Readonly` **connections**: `ComplexMap`<`PublicKey`, [`MemorySignalManager`](dxos_messaging.MemorySignalManager.md)\>

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:27](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/memory-signal-manager.ts#L27)

___

### swarmEvent

 `Readonly` **swarmEvent**: `Event`<{ `swarmEvent`: `SwarmEvent` ; `topic`: `PublicKey`  }\>

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:21](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/memory-signal-manager.ts#L21)

___

### swarms

 `Readonly` **swarms**: `ComplexMap`<`PublicKey`, `ComplexSet`<`PublicKey`\>\>

#### Defined in

[packages/mesh/messaging/src/memory-signal-manager.ts:24](https://github.com/dxos/dxos/blob/main/packages/mesh/messaging/src/memory-signal-manager.ts#L24)

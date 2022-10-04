# Interface: ReplicatorMiddleware

[@dxos/protocol-plugin-replicator](../modules/dxos_protocol_plugin_replicator.md).ReplicatorMiddleware

## Properties

### load

 **load**: `LoadFunction`

Returns a list of local feeds to replicate.

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L42)

___

### replicate

 `Optional` **replicate**: `ReplicateFunction`

Maps feed replication requests to a set of feed descriptors to be replicated.

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:52](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L52)

___

### subscribe

 `Optional` **subscribe**: `SubscribeFunction`

Subscribe to new local feeds being opened.

#### Defined in

[packages/core/mesh/protocol-plugin-replicator/src/replicator.ts:47](https://github.com/dxos/dxos/blob/main/packages/core/mesh/protocol-plugin-replicator/src/replicator.ts#L47)

# Interface: ReplicatorMiddleware

[@dxos/protocol-plugin-replicator](../modules/dxos_protocol_plugin_replicator.md).ReplicatorMiddleware

## Properties

### load

 **load**: `LoadFunction`

Returns a list of local feeds to replicate.

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:41](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L41)

___

### replicate

 `Optional` **replicate**: `ReplicateFunction`

Maps feed replication requests to a set of feed descriptors to be replicated.

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:51](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L51)

___

### subscribe

 `Optional` **subscribe**: `SubscribeFunction`

Subscribe to new local feeds being opened.

#### Defined in

[packages/mesh/protocol-plugin-replicator/src/replicator.ts:46](https://github.com/dxos/dxos/blob/main/packages/mesh/protocol-plugin-replicator/src/replicator.ts#L46)

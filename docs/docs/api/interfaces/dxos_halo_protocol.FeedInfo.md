# Interface: FeedInfo

[@dxos/halo-protocol](../modules/dxos_halo_protocol.md).FeedInfo

## Properties

### assertion

 **assertion**: `AdmittedFeed`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:16](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L16)

___

### credential

 **credential**: `Credential`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:15](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L15)

___

### key

 **key**: `PublicKey`

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:14](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L14)

___

### parent

 **parent**: `PublicKey`

Parent feed from the feed tree.
This is the feed where the AdmittedFeed assertion is written.

The genesis feed will have itself as a parent.

#### Defined in

[packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts:23](https://github.com/dxos/dxos/blob/main/packages/core/halo/halo-protocol/src/state-machine/feed-state-machine.ts#L23)

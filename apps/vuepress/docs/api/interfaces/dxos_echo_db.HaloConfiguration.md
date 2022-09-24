# Interface: HaloConfiguration

[@dxos/echo-db](../modules/dxos_echo_db.md).HaloConfiguration

## Table of contents

### Properties

- [feedProviderFactory](dxos_echo_db.HaloConfiguration.md#feedproviderfactory)
- [keyring](dxos_echo_db.HaloConfiguration.md#keyring)
- [metadataStore](dxos_echo_db.HaloConfiguration.md#metadatastore)
- [modelFactory](dxos_echo_db.HaloConfiguration.md#modelfactory)
- [networkManager](dxos_echo_db.HaloConfiguration.md#networkmanager)
- [options](dxos_echo_db.HaloConfiguration.md#options)
- [snapshotStore](dxos_echo_db.HaloConfiguration.md#snapshotstore)

## Properties

### feedProviderFactory

• **feedProviderFactory**: (`partyKey`: `PublicKey`) => [`PartyFeedProvider`](../classes/dxos_echo_db.PartyFeedProvider.md)

#### Type declaration

▸ (`partyKey`): [`PartyFeedProvider`](../classes/dxos_echo_db.PartyFeedProvider.md)

##### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

##### Returns

[`PartyFeedProvider`](../classes/dxos_echo_db.PartyFeedProvider.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:41](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L41)

___

### keyring

• **keyring**: `Keyring`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:36](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L36)

___

### metadataStore

• **metadataStore**: [`MetadataStore`](../classes/dxos_echo_db.MetadataStore.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:38](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L38)

___

### modelFactory

• **modelFactory**: `ModelFactory`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L39)

___

### networkManager

• **networkManager**: `NetworkManager`

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:37](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L37)

___

### options

• **options**: [`PipelineOptions`](dxos_echo_db.PipelineOptions.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:42](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L42)

___

### snapshotStore

• **snapshotStore**: [`SnapshotStore`](../classes/dxos_echo_db.SnapshotStore.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo.ts:40](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/halo/halo.ts#L40)

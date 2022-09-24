# Class: PartyPipeline

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyPipeline

Encapsulates core components needed by a party:
- ECHO database with item-manager & item-demuxer.
- HALO PartyState state-machine that handles key admission.
- Data processing pipeline with the feed-store iterator that reads the messages in the proper order.

The core class also handles the combined ECHO and HALO state snapshots.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.PartyPipeline.md#constructor)

### Properties

- [\_database](dxos_echo_db.PartyPipeline.md#_database)
- [\_databaseSnapshot](dxos_echo_db.PartyPipeline.md#_databasesnapshot)
- [\_partyProcessor](dxos_echo_db.PartyPipeline.md#_partyprocessor)
- [\_pipeline](dxos_echo_db.PartyPipeline.md#_pipeline)
- [\_subscriptions](dxos_echo_db.PartyPipeline.md#_subscriptions)
- [\_timeframeClock](dxos_echo_db.PartyPipeline.md#_timeframeclock)

### Accessors

- [credentialsWriter](dxos_echo_db.PartyPipeline.md#credentialswriter)
- [database](dxos_echo_db.PartyPipeline.md#database)
- [isOpen](dxos_echo_db.PartyPipeline.md#isopen)
- [key](dxos_echo_db.PartyPipeline.md#key)
- [pipeline](dxos_echo_db.PartyPipeline.md#pipeline)
- [processor](dxos_echo_db.PartyPipeline.md#processor)
- [timeframe](dxos_echo_db.PartyPipeline.md#timeframe)
- [timeframeUpdate](dxos_echo_db.PartyPipeline.md#timeframeupdate)

### Methods

- [close](dxos_echo_db.PartyPipeline.md#close)
- [createSnapshot](dxos_echo_db.PartyPipeline.md#createsnapshot)
- [getWriteFeed](dxos_echo_db.PartyPipeline.md#getwritefeed)
- [open](dxos_echo_db.PartyPipeline.md#open)
- [restoreFromSnapshot](dxos_echo_db.PartyPipeline.md#restorefromsnapshot)

## Constructors

### constructor

• **new PartyPipeline**(`_partyKey`, `_feedProvider`, `_modelFactory`, `_snapshotStore`, `_memberKey`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |
| `_feedProvider` | [`PartyFeedProvider`](dxos_echo_db.PartyFeedProvider.md) |
| `_modelFactory` | `ModelFactory` |
| `_snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_memberKey` | `PublicKey` |
| `_options` | [`PipelineOptions`](../interfaces/dxos_echo_db.PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:73](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L73)

## Properties

### \_database

• `Private` `Optional` **\_database**: [`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:68](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L68)

___

### \_databaseSnapshot

• `Private` **\_databaseSnapshot**: `undefined` \| `DatabaseSnapshot`

Snapshot to be restored from when party.open() is called.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:64](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L64)

___

### \_partyProcessor

• `Private` `Optional` **\_partyProcessor**: [`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:70](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L70)

___

### \_pipeline

• `Private` `Optional` **\_pipeline**: [`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:69](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L69)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:66](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L66)

___

### \_timeframeClock

• `Private` `Optional` **\_timeframeClock**: [`TimeframeClock`](dxos_echo_db.TimeframeClock.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:71](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L71)

## Accessors

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:121](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L121)

___

### database

• `get` **database**(): [`Database`](dxos_echo_db.Database.md)

#### Returns

[`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:90](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L90)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:86](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L86)

___

### key

• `get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:82](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L82)

___

### pipeline

• `get` **pipeline**(): [`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Returns

[`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:100](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L100)

___

### processor

• `get` **processor**(): [`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Returns

[`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:95](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L95)

___

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:105](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L105)

___

### timeframeUpdate

• `get` **timeframeUpdate**(): `Event`<`Timeframe`\>

#### Returns

`Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:110](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L110)

## Methods

### close

▸ **close**(): `Promise`<[`PartyPipeline`](dxos_echo_db.PartyPipeline.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`PartyPipeline`](dxos_echo_db.PartyPipeline.md)\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:215](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L215)

___

### createSnapshot

▸ **createSnapshot**(): `PartySnapshot`

Create a snapshot of the current state.

#### Returns

`PartySnapshot`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:238](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L238)

___

### getWriteFeed

▸ **getWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:115](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L115)

___

### open

▸ **open**(`options`): `Promise`<[`PartyPipeline`](dxos_echo_db.PartyPipeline.md)\>

Opens the pipeline and connects the streams.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`OpenOptions`](../interfaces/dxos_echo_db.OpenOptions.md) |

#### Returns

`Promise`<[`PartyPipeline`](dxos_echo_db.PartyPipeline.md)\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:129](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L129)

___

### restoreFromSnapshot

▸ **restoreFromSnapshot**(`snapshot`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:250](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L250)

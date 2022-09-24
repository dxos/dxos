# Class: PartyPipeline

Encapsulates core components needed by a party:
- ECHO database with item-manager & item-demuxer.
- HALO PartyState state-machine that handles key admission.
- Data processing pipeline with the feed-store iterator that reads the messages in the proper order.

The core class also handles the combined ECHO and HALO state snapshots.

## Table of contents

### Constructors

- [constructor](PartyPipeline.md#constructor)

### Properties

- [\_database](PartyPipeline.md#_database)
- [\_databaseSnapshot](PartyPipeline.md#_databasesnapshot)
- [\_partyProcessor](PartyPipeline.md#_partyprocessor)
- [\_pipeline](PartyPipeline.md#_pipeline)
- [\_subscriptions](PartyPipeline.md#_subscriptions)
- [\_timeframeClock](PartyPipeline.md#_timeframeclock)

### Accessors

- [credentialsWriter](PartyPipeline.md#credentialswriter)
- [database](PartyPipeline.md#database)
- [isOpen](PartyPipeline.md#isopen)
- [key](PartyPipeline.md#key)
- [pipeline](PartyPipeline.md#pipeline)
- [processor](PartyPipeline.md#processor)
- [timeframe](PartyPipeline.md#timeframe)
- [timeframeUpdate](PartyPipeline.md#timeframeupdate)

### Methods

- [close](PartyPipeline.md#close)
- [createSnapshot](PartyPipeline.md#createsnapshot)
- [getWriteFeed](PartyPipeline.md#getwritefeed)
- [open](PartyPipeline.md#open)
- [restoreFromSnapshot](PartyPipeline.md#restorefromsnapshot)

## Constructors

### constructor

• **new PartyPipeline**(`_partyKey`, `_feedProvider`, `_modelFactory`, `_snapshotStore`, `_memberKey`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_partyKey` | `PublicKey` |
| `_feedProvider` | [`PartyFeedProvider`](PartyFeedProvider.md) |
| `_modelFactory` | `ModelFactory` |
| `_snapshotStore` | [`SnapshotStore`](SnapshotStore.md) |
| `_memberKey` | `PublicKey` |
| `_options` | [`PipelineOptions`](../interfaces/PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:73](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L73)

## Properties

### \_database

• `Private` `Optional` **\_database**: [`Database`](Database.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:68](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L68)

___

### \_databaseSnapshot

• `Private` **\_databaseSnapshot**: `undefined` \| `DatabaseSnapshot`

Snapshot to be restored from when party.open() is called.

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:64](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L64)

___

### \_partyProcessor

• `Private` `Optional` **\_partyProcessor**: [`PartyProcessor`](PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:70](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L70)

___

### \_pipeline

• `Private` `Optional` **\_pipeline**: [`FeedMuxer`](FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:69](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L69)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:66](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L66)

___

### \_timeframeClock

• `Private` `Optional` **\_timeframeClock**: [`TimeframeClock`](TimeframeClock.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:71](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L71)

## Accessors

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:121](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L121)

___

### database

• `get` **database**(): [`Database`](Database.md)

#### Returns

[`Database`](Database.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:90](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L90)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:86](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L86)

___

### key

• `get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:82](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L82)

___

### pipeline

• `get` **pipeline**(): [`FeedMuxer`](FeedMuxer.md)

#### Returns

[`FeedMuxer`](FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:100](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L100)

___

### processor

• `get` **processor**(): [`PartyProcessor`](PartyProcessor.md)

#### Returns

[`PartyProcessor`](PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:95](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L95)

___

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:105](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L105)

___

### timeframeUpdate

• `get` **timeframeUpdate**(): `Event`<`Timeframe`\>

#### Returns

`Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:110](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L110)

## Methods

### close

▸ **close**(): `Promise`<[`PartyPipeline`](PartyPipeline.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`PartyPipeline`](PartyPipeline.md)\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:215](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L215)

___

### createSnapshot

▸ **createSnapshot**(): `PartySnapshot`

Create a snapshot of the current state.

#### Returns

`PartySnapshot`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:238](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L238)

___

### getWriteFeed

▸ **getWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:115](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L115)

___

### open

▸ **open**(`options`): `Promise`<[`PartyPipeline`](PartyPipeline.md)\>

Opens the pipeline and connects the streams.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`OpenOptions`](../interfaces/OpenOptions.md) |

#### Returns

`Promise`<[`PartyPipeline`](PartyPipeline.md)\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:129](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L129)

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

[packages/echo/echo-db/src/pipeline/party-pipeline.ts:250](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/party-pipeline.ts#L250)

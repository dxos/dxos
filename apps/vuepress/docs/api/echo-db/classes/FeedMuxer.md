# Class: FeedMuxer

Manages the inbound and outbound message streams for an individual party.
Reads messages from individual feeds and splits them into ECHO and HALO streams.

## Table of contents

### Constructors

- [constructor](FeedMuxer.md#constructor)

### Properties

- [\_echoProcessor](FeedMuxer.md#_echoprocessor)
- [\_errors](FeedMuxer.md#_errors)
- [\_isOpen](FeedMuxer.md#_isopen)
- [\_outboundEchoStream](FeedMuxer.md#_outboundechostream)
- [\_outboundHaloStream](FeedMuxer.md#_outboundhalostream)

### Accessors

- [errors](FeedMuxer.md#errors)
- [isOpen](FeedMuxer.md#isopen)
- [outboundEchoStream](FeedMuxer.md#outboundechostream)
- [outboundHaloStream](FeedMuxer.md#outboundhalostream)
- [readOnly](FeedMuxer.md#readonly)

### Methods

- [close](FeedMuxer.md#close)
- [open](FeedMuxer.md#open)
- [setEchoProcessor](FeedMuxer.md#setechoprocessor)

## Constructors

### constructor

• **new FeedMuxer**(`_partyProcessor`, `_feedStorIterator`, `_timeframeClock`, `_feedWriter?`, `_options?`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_partyProcessor` | [`CredentialProcessor`](../interfaces/CredentialProcessor.md) & [`PartyStateProvider`](../interfaces/PartyStateProvider.md) | Processes HALO messages to update party state. |
| `_feedStorIterator` | `FeedStoreIterator` | Inbound messages from the feed store. |
| `_timeframeClock` | [`TimeframeClock`](TimeframeClock.md) | Tracks current echo timestamp. |
| `_feedWriter?` | `FeedWriter`<`FeedMessage`\> | Outbound messages to the writeStream feed. |
| `_options` | `Options` |  |

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:54](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L54)

## Properties

### \_echoProcessor

• `Private` **\_echoProcessor**: `undefined` \| [`EchoProcessor`](../modules.md#echoprocessor)

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L45)

___

### \_errors

• `Private` `Readonly` **\_errors**: `Event`<`Error`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:31](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L31)

___

### \_isOpen

• `Private` **\_isOpen**: `boolean` = `false`

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:33](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L33)

___

### \_outboundEchoStream

• `Private` **\_outboundEchoStream**: `undefined` \| `FeedWriter`<`EchoEnvelope`\>

Messages to write into pipeline (e.g., mutations from model).

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:38](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L38)

___

### \_outboundHaloStream

• `Private` **\_outboundHaloStream**: `undefined` \| `FeedWriter`<`Message`\>

Halo message stream to write into pipeline.

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:43](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L43)

## Accessors

### errors

• `get` **errors**(): `Event`<`Error`\>

#### Returns

`Event`<`Error`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:95](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L95)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:79](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L79)

___

### outboundEchoStream

• `get` **outboundEchoStream**(): `undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Returns

`undefined` \| `FeedWriter`<`EchoEnvelope`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:87](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L87)

___

### outboundHaloStream

• `get` **outboundHaloStream**(): `undefined` \| `FeedWriter`<`Message`\>

#### Returns

`undefined` \| `FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:91](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L91)

___

### readOnly

• `get` **readOnly**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:83](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L83)

## Methods

### close

▸ **close**(): `Promise`<`void`\>

Close all streams.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:180](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L180)

___

### open

▸ **open**(): `Promise`<`undefined` \| `FeedWriter`<`EchoEnvelope`\>\>

Create inbound and outbound pipielines.
https://nodejs.org/api/stream.html#stream_stream_pipeline_source_transforms_destination_callback

Feed
  Transform(FeedBlock => IEchoStream): Party processing (clock ordering)
    ItemDemuxer
      Transform(dxos.echo.IEchoEnvelope => dxos.IFeedMessage): update clock
        Feed

#### Returns

`Promise`<`undefined` \| `FeedWriter`<`EchoEnvelope`\>\>

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:113](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L113)

___

### setEchoProcessor

▸ **setEchoProcessor**(`processor`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `processor` | [`EchoProcessor`](../modules.md#echoprocessor) |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/pipeline/feed-muxer.ts:99](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/feed-muxer.ts#L99)

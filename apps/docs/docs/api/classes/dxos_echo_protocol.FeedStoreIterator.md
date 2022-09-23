---
id: "dxos_echo_protocol.FeedStoreIterator"
title: "Class: FeedStoreIterator"
sidebar_label: "FeedStoreIterator"
custom_edit_url: null
---

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).FeedStoreIterator

We are using an iterator here instead of a stream to ensure we have full control over how and at what time
data is read. This allows the consumer (e.g., PartyProcessor) to control the order in which data is generated.
(Streams would not be suitable since NodeJS streams have intenal buffer that the system tends to eagerly fill.)

## Implements

- `AsyncIterable`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)\>

## Constructors

### constructor

• **new FeedStoreIterator**(`_feedSelector`, `_messageSelector`, `_skipTimeframe`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_feedSelector` | [`FeedSelector`](../modules/dxos_echo_protocol.md#feedselector) |  |
| `_messageSelector` | [`MessageSelector`](../modules/dxos_echo_protocol.md#messageselector) |  |
| `_skipTimeframe` | `Timeframe` | Feeds are read starting from the first message after this timeframe. |

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:65](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L65)

## Properties

### \_candidateFeeds

• `Private` `Readonly` **\_candidateFeeds**: `Set`<`FeedDescriptor`\>

Curent set of active feeds.

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:35](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L35)

___

### \_closeTrigger

• `Private` `Readonly` **\_closeTrigger**: `Trigger`

Trigger to wait for the iteration to stop in the close method;

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L51)

___

### \_closed

• `Private` **\_closed**: `boolean` = `false`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:56](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L56)

___

### \_generatorInstance

• `Private` `Readonly` **\_generatorInstance**: `AsyncGenerator`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock), `void`, `unknown`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:46](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L46)

___

### \_messageCount

• `Private` **\_messageCount**: `number` = `0`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:54](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L54)

___

### \_openFeeds

• `Private` `Readonly` **\_openFeeds**: `Map`<`string`, { `descriptor`: `FeedDescriptor` ; `frozen`: `boolean` ; `iterator`: `AsyncIterator`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)[], `any`, `undefined`\> ; `sendQueue`: [`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)[]  }\>

Feed key as hex => feed state

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:38](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L38)

___

### \_trigger

• `Private` `Readonly` **\_trigger**: `Trigger`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:45](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L45)

___

### stalled

• `Readonly` **stalled**: `Event`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)[]\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:58](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L58)

## Methods

### [asyncIterator]

▸ **[asyncIterator]**(): `AsyncGenerator`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock), `void`, `unknown`\>

This gets called by `for await` loop to get the iterator instance that's then polled on each loop iteration.
We return a singleton here to ensure that the `_generator` function only gets called once.

#### Returns

`AsyncGenerator`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock), `void`, `unknown`\>

#### Implementation of

AsyncIterable.\_\_@asyncIterator@9718

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:97](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L97)

___

### \_generator

▸ **_generator**(): `AsyncGenerator`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock), `void`, `unknown`\>

#### Returns

`AsyncGenerator`<[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock), `void`, `unknown`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:234](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L234)

___

### \_getMessageCandidates

▸ `Private` **_getMessageCandidates**(): [`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)[]

Returns all messages that are waiting to be read from each of the open feeds.

#### Returns

[`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)[]

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:144](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L144)

___

### \_pollFeeds

▸ `Private` **_pollFeeds**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:180](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L180)

___

### \_popSendQueue

▸ `Private` **_popSendQueue**(): `undefined` \| [`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)

#### Returns

`undefined` \| [`FeedBlock`](../modules/dxos_echo_protocol.md#feedblock)

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:155](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L155)

___

### \_reevaluateFeeds

▸ `Private` **_reevaluateFeeds**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:105](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L105)

___

### \_startReadingFromFeed

▸ `Private` **_startReadingFromFeed**(`descriptor`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | `FeedDescriptor` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:122](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L122)

___

### \_waitForData

▸ `Private` **_waitForData**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:209](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L209)

___

### addFeedDescriptor

▸ **addFeedDescriptor**(`descriptor`): [`FeedStoreIterator`](dxos_echo_protocol.FeedStoreIterator.md)

Adds a feed to be consumed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | `FeedDescriptor` |

#### Returns

[`FeedStoreIterator`](dxos_echo_protocol.FeedStoreIterator.md)

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:78](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L78)

___

### close

▸ **close**(): `Promise`<`void`\>

Closes the iterator

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:87](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L87)

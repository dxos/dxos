# Class: FeedStoreIterator

[@dxos/echo-protocol](../modules/dxos_echo_protocol.md).FeedStoreIterator

We are using an iterator here instead of a stream to ensure we have full control over how and at what time
data is read. This allows the consumer (e.g., PartyProcessor) to control the order in which data is generated.
(Streams would not be suitable since NodeJS streams have intenal buffer that the system tends to eagerly fill.)

## Implements

- `AsyncIterable`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)\>

## Constructors

### constructor

**new FeedStoreIterator**(`_feedSelector`, `_messageSelector`, `_skipTimeframe`)

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `_feedSelector` | [`FeedSelector`](../types/dxos_echo_protocol.FeedSelector.md) |  |
| `_messageSelector` | [`MessageSelector`](../types/dxos_echo_protocol.MessageSelector.md) |  |
| `_skipTimeframe` | `Timeframe` | Feeds are read starting from the first message after this timeframe. |

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:67](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L67)

## Properties

### \_candidateFeeds

 `Private` `Readonly` **\_candidateFeeds**: `Set`<`FeedDescriptor`\>

Curent set of active feeds.

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:37](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L37)

___

### \_closeTrigger

 `Private` `Readonly` **\_closeTrigger**: `Trigger`

Trigger to wait for the iteration to stop in the close method;

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:53](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L53)

___

### \_closed

 `Private` **\_closed**: `boolean` = `false`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:58](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L58)

___

### \_generatorInstance

 `Private` `Readonly` **\_generatorInstance**: `AsyncGenerator`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md), `void`, `unknown`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:48](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L48)

___

### \_messageCount

 `Private` **\_messageCount**: `number` = `0`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:56](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L56)

___

### \_openFeeds

 `Private` `Readonly` **\_openFeeds**: `Map`<`string`, { `descriptor`: `FeedDescriptor` ; `frozen`: `boolean` ; `iterator`: `AsyncIterator`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)[], `any`, `undefined`\> ; `sendQueue`: [`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)[]  }\>

Feed key as hex => feed state

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:40](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L40)

___

### \_trigger

 `Private` `Readonly` **\_trigger**: `Trigger`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:47](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L47)

___

### stalled

 `Readonly` **stalled**: `Event`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)[]\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:60](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L60)

## Methods

### [asyncIterator]

**[asyncIterator]**(): `AsyncGenerator`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md), `void`, `unknown`\>

This gets called by `for await` loop to get the iterator instance that's then polled on each loop iteration.
We return a singleton here to ensure that the `_generator` function only gets called once.

#### Returns

`AsyncGenerator`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md), `void`, `unknown`\>

#### Implementation of

AsyncIterable.\_\_@asyncIterator@9795

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:99](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L99)

___

### \_generator

**_generator**(): `AsyncGenerator`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md), `void`, `unknown`\>

#### Returns

`AsyncGenerator`<[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md), `void`, `unknown`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:236](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L236)

___

### \_getMessageCandidates

`Private` **_getMessageCandidates**(): [`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)[]

Returns all messages that are waiting to be read from each of the open feeds.

#### Returns

[`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)[]

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:146](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L146)

___

### \_pollFeeds

`Private` **_pollFeeds**(): `void`

#### Returns

`void`

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:182](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L182)

___

### \_popSendQueue

`Private` **_popSendQueue**(): `undefined` \| [`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)

#### Returns

`undefined` \| [`FeedBlock`](../types/dxos_echo_protocol.FeedBlock.md)

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:157](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L157)

___

### \_reevaluateFeeds

`Private` **_reevaluateFeeds**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:107](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L107)

___

### \_startReadingFromFeed

`Private` **_startReadingFromFeed**(`descriptor`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | `FeedDescriptor` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:124](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L124)

___

### \_waitForData

`Private` **_waitForData**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:211](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L211)

___

### addFeedDescriptor

**addFeedDescriptor**(`descriptor`): [`FeedStoreIterator`](dxos_echo_protocol.FeedStoreIterator.md)

Adds a feed to be consumed.

#### Parameters

| Name | Type |
| :------ | :------ |
| `descriptor` | `FeedDescriptor` |

#### Returns

[`FeedStoreIterator`](dxos_echo_protocol.FeedStoreIterator.md)

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:80](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L80)

___

### close

**close**(): `Promise`<`void`\>

Closes the iterator

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts:89](https://github.com/dxos/dxos/blob/main/packages/echo/echo-protocol/src/feeds/feed-store-iterator.ts#L89)

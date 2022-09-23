---
id: "dxos_echo_db.PartyFeedProvider"
title: "Class: PartyFeedProvider"
sidebar_label: "PartyFeedProvider"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyFeedProvider

## Constructors

### constructor

• **new PartyFeedProvider**(`_metadataStore`, `_keyring`, `_feedStore`, `_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_keyring` | `Keyring` |
| `_feedStore` | `FeedStore` |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:25](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L25)

## Properties

### \_feeds

• `Private` `Readonly` **\_feeds**: `ComplexMap`<`PublicKey`, `FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:22](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L22)

___

### feedOpened

• `Readonly` **feedOpened**: `Event`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:23](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L23)

## Methods

### \_createReadWriteFeed

▸ `Private` **_createReadWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:83](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L83)

___

### \_trackFeed

▸ `Private` **_trackFeed**(`feed`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | `FeedDescriptor` |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:72](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L72)

___

### createIterator

▸ **createIterator**(`messageSelector`, `feedSelector`, `initialTimeframe?`): `Promise`<`FeedStoreIterator`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `messageSelector` | `MessageSelector` |
| `feedSelector` | `FeedSelector` |
| `initialTimeframe?` | `Timeframe` |

#### Returns

`Promise`<`FeedStoreIterator`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:93](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L93)

___

### createOrOpenReadOnlyFeed

▸ **createOrOpenReadOnlyFeed**(`feedKey`): `Promise`<`FeedDescriptor`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:57](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L57)

___

### createOrOpenWritableFeed

▸ **createOrOpenWritableFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:36](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L36)

___

### getFeeds

▸ **getFeeds**(): `FeedDescriptor`[]

#### Returns

`FeedDescriptor`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:32](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L32)

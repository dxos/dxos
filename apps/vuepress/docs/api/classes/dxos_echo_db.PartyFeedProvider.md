# Class: PartyFeedProvider

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyFeedProvider

## Constructors

### constructor

**new PartyFeedProvider**(`_metadataStore`, `_keyring`, `_feedStore`, `_partyKey`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_keyring` | `Keyring` |
| `_feedStore` | `FeedStore` |
| `_partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:26](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L26)

## Properties

### \_feeds

 `Private` `Readonly` **\_feeds**: `ComplexMap`<`PublicKey`, `FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:23](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L23)

___

### feedOpened

 `Readonly` **feedOpened**: `Event`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:24](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L24)

## Methods

### \_createReadWriteFeed

`Private` **_createReadWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:84](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L84)

___

### \_trackFeed

`Private` **_trackFeed**(`feed`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `feed` | `FeedDescriptor` |

#### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:73](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L73)

___

### createIterator

**createIterator**(`messageSelector`, `feedSelector`, `initialTimeframe?`): `Promise`<`FeedStoreIterator`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `messageSelector` | `MessageSelector` |
| `feedSelector` | `FeedSelector` |
| `initialTimeframe?` | `Timeframe` |

#### Returns

`Promise`<`FeedStoreIterator`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:94](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L94)

___

### createOrOpenReadOnlyFeed

**createOrOpenReadOnlyFeed**(`feedKey`): `Promise`<`FeedDescriptor`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedKey` | `PublicKey` |

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:58](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L58)

___

### createOrOpenWritableFeed

**createOrOpenWritableFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:37](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L37)

___

### getFeeds

**getFeeds**(): `FeedDescriptor`[]

#### Returns

`FeedDescriptor`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/party-feed-provider.ts:33](https://github.com/dxos/dxos/blob/db8188dae/packages/echo/echo-db/src/pipeline/party-feed-provider.ts#L33)

# Class: DataParty

Generic parties that peers create that is capable of storing data in the database.

This class handles data-storage, replication, snapshots, access-control, and invitations.

## Table of contents

### Constructors

- [constructor](DataParty.md#constructor)

### Properties

- [\_genesisFeedKey](DataParty.md#_genesisfeedkey)
- [\_invitationManager](DataParty.md#_invitationmanager)
- [\_partyCore](DataParty.md#_partycore)
- [\_preferences](DataParty.md#_preferences)
- [\_protocol](DataParty.md#_protocol)
- [update](DataParty.md#update)

### Accessors

- [credentialsWriter](DataParty.md#credentialswriter)
- [database](DataParty.md#database)
- [genesisFeedKey](DataParty.md#genesisfeedkey)
- [invitationManager](DataParty.md#invitationmanager)
- [isActive](DataParty.md#isactive)
- [isOpen](DataParty.md#isopen)
- [key](DataParty.md#key)
- [partyInfo](DataParty.md#partyinfo)
- [pipeline](DataParty.md#pipeline)
- [processor](DataParty.md#processor)
- [timeframe](DataParty.md#timeframe)
- [timeframeUpdate](DataParty.md#timeframeupdate)
- [title](DataParty.md#title)

### Methods

- [activate](DataParty.md#activate)
- [close](DataParty.md#close)
- [createSnapshot](DataParty.md#createsnapshot)
- [deactivate](DataParty.md#deactivate)
- [getFeeds](DataParty.md#getfeeds)
- [getPropertiesItem](DataParty.md#getpropertiesitem)
- [getPropertiesSet](DataParty.md#getpropertiesset)
- [getWriteFeed](DataParty.md#getwritefeed)
- [open](DataParty.md#open)
- [queryMembers](DataParty.md#querymembers)
- [restoreFromSnapshot](DataParty.md#restorefromsnapshot)
- [setTitle](DataParty.md#settitle)

## Constructors

### constructor

• **new DataParty**(`partyKey`, `modelFactory`, `snapshotStore`, `_feedProvider`, `_metadataStore`, `_credentialsSigner`, `_profilePreferences`, `_networkManager`, `_initialTimeframe?`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `modelFactory` | `ModelFactory` |
| `snapshotStore` | [`SnapshotStore`](SnapshotStore.md) |
| `_feedProvider` | [`PartyFeedProvider`](PartyFeedProvider.md) |
| `_metadataStore` | [`MetadataStore`](MetadataStore.md) |
| `_credentialsSigner` | [`CredentialsSigner`](CredentialsSigner.md) |
| `_profilePreferences` | `undefined` \| [`Preferences`](Preferences.md) |
| `_networkManager` | `NetworkManager` |
| `_initialTimeframe?` | `Timeframe` |
| `_options` | [`PipelineOptions`](../interfaces/PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:54](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L54)

## Properties

### \_genesisFeedKey

• `Private` `Optional` **\_genesisFeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:52](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L52)

___

### \_invitationManager

• `Private` `Optional` **\_invitationManager**: [`InvitationFactory`](InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L49)

___

### \_partyCore

• `Private` `Readonly` **\_partyCore**: [`PartyPipeline`](PartyPipeline.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:47](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L47)

___

### \_preferences

• `Private` `Optional` `Readonly` **\_preferences**: [`PartyPreferences`](PartyPreferences.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L48)

___

### \_protocol

• `Private` `Optional` **\_protocol**: [`PartyProtocolFactory`](PartyProtocolFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:50](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L50)

___

### update

• `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L45)

## Accessors

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:133](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L133)

___

### database

• `get` **database**(): [`Database`](Database.md)

#### Returns

[`Database`](Database.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:101](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L101)

___

### genesisFeedKey

• `get` **genesisFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:147](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L147)

___

### invitationManager

• `get` **invitationManager**(): [`InvitationFactory`](InvitationFactory.md)

#### Returns

[`InvitationFactory`](InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:128](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L128)

___

### isActive

• `get` **isActive**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:251](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L251)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:97](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L97)

___

### key

• `get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:93](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L93)

___

### partyInfo

• `get` **partyInfo**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `feedKeys` | `number` |
| `isActive` | `boolean` |
| `isOpen` | `boolean` |
| `key` | `string` |
| `properties` | `any` |
| `timeframe` | `undefined` \| `Timeframe` |

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:82](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L82)

___

### pipeline

• `get` **pipeline**(): [`FeedMuxer`](FeedMuxer.md)

#### Returns

[`FeedMuxer`](FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:113](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L113)

___

### processor

• `get` **processor**(): [`PartyProcessor`](PartyProcessor.md)

#### Returns

[`PartyProcessor`](PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:108](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L108)

___

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:118](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L118)

___

### timeframeUpdate

• `get` **timeframeUpdate**(): `Event`<`Timeframe`\>

#### Returns

`Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:123](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L123)

___

### title

• `get` **title**(): `any`

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:137](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L137)

## Methods

### activate

▸ **activate**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ActivationOptions`](../interfaces/ActivationOptions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:256](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L256)

___

### close

▸ **close**(): `Promise`<[`DataParty`](DataParty.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:223](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L223)

___

### createSnapshot

▸ **createSnapshot**(): `PartySnapshot`

Create a snapshot of the current state.

#### Returns

`PartySnapshot`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:301](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L301)

___

### deactivate

▸ **deactivate**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ActivationOptions`](../interfaces/ActivationOptions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:267](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L267)

___

### getFeeds

▸ **getFeeds**(): `FeedDescriptor`[]

#### Returns

`FeedDescriptor`[]

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:247](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L247)

___

### getPropertiesItem

▸ **getPropertiesItem**(): `Promise`<[`Item`](Item.md)<`ObjectModel`\>\>

Returns a special Item that is used by the Party to manage its properties.

#### Returns

`Promise`<[`Item`](Item.md)<`ObjectModel`\>\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:281](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L281)

___

### getPropertiesSet

▸ **getPropertiesSet**(): [`SelectionResult`](SelectionResult.md)<[`Item`](Item.md)<`any`\>, `void`\>

Get the SelectionResult for the Properties Item query.

#### Returns

[`SelectionResult`](SelectionResult.md)<[`Item`](Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:293](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L293)

___

### getWriteFeed

▸ **getWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:243](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L243)

___

### open

▸ **open**(): `Promise`<[`DataParty`](DataParty.md)\>

Opens the pipeline and connects the streams.

#### Returns

`Promise`<[`DataParty`](DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:162](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L162)

___

### queryMembers

▸ **queryMembers**(): [`ResultSet`](ResultSet.md)<[`PartyMember`](../interfaces/PartyMember.md)\>

Get all party members.

#### Returns

[`ResultSet`](ResultSet.md)<[`PartyMember`](../interfaces/PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:312](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L312)

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

[packages/echo/echo-db/src/parties/data-party.ts:305](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L305)

___

### setTitle

▸ **setTitle**(`title`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `title` | `string` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:141](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L141)

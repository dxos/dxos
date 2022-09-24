# Class: DataParty

[@dxos/echo-db](../modules/dxos_echo_db.md).DataParty

Generic parties that peers create that is capable of storing data in the database.

This class handles data-storage, replication, snapshots, access-control, and invitations.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.DataParty.md#constructor)

### Properties

- [\_genesisFeedKey](dxos_echo_db.DataParty.md#_genesisfeedkey)
- [\_invitationManager](dxos_echo_db.DataParty.md#_invitationmanager)
- [\_partyCore](dxos_echo_db.DataParty.md#_partycore)
- [\_preferences](dxos_echo_db.DataParty.md#_preferences)
- [\_protocol](dxos_echo_db.DataParty.md#_protocol)
- [update](dxos_echo_db.DataParty.md#update)

### Accessors

- [credentialsWriter](dxos_echo_db.DataParty.md#credentialswriter)
- [database](dxos_echo_db.DataParty.md#database)
- [genesisFeedKey](dxos_echo_db.DataParty.md#genesisfeedkey)
- [invitationManager](dxos_echo_db.DataParty.md#invitationmanager)
- [isActive](dxos_echo_db.DataParty.md#isactive)
- [isOpen](dxos_echo_db.DataParty.md#isopen)
- [key](dxos_echo_db.DataParty.md#key)
- [partyInfo](dxos_echo_db.DataParty.md#partyinfo)
- [pipeline](dxos_echo_db.DataParty.md#pipeline)
- [processor](dxos_echo_db.DataParty.md#processor)
- [timeframe](dxos_echo_db.DataParty.md#timeframe)
- [timeframeUpdate](dxos_echo_db.DataParty.md#timeframeupdate)
- [title](dxos_echo_db.DataParty.md#title)

### Methods

- [activate](dxos_echo_db.DataParty.md#activate)
- [close](dxos_echo_db.DataParty.md#close)
- [createSnapshot](dxos_echo_db.DataParty.md#createsnapshot)
- [deactivate](dxos_echo_db.DataParty.md#deactivate)
- [getFeeds](dxos_echo_db.DataParty.md#getfeeds)
- [getPropertiesItem](dxos_echo_db.DataParty.md#getpropertiesitem)
- [getPropertiesSet](dxos_echo_db.DataParty.md#getpropertiesset)
- [getWriteFeed](dxos_echo_db.DataParty.md#getwritefeed)
- [open](dxos_echo_db.DataParty.md#open)
- [queryMembers](dxos_echo_db.DataParty.md#querymembers)
- [restoreFromSnapshot](dxos_echo_db.DataParty.md#restorefromsnapshot)
- [setTitle](dxos_echo_db.DataParty.md#settitle)

## Constructors

### constructor

• **new DataParty**(`partyKey`, `modelFactory`, `snapshotStore`, `_feedProvider`, `_metadataStore`, `_credentialsSigner`, `_profilePreferences`, `_networkManager`, `_initialTimeframe?`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `modelFactory` | `ModelFactory` |
| `snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_feedProvider` | [`PartyFeedProvider`](dxos_echo_db.PartyFeedProvider.md) |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_credentialsSigner` | [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md) |
| `_profilePreferences` | `undefined` \| [`Preferences`](dxos_echo_db.Preferences.md) |
| `_networkManager` | `NetworkManager` |
| `_initialTimeframe?` | `Timeframe` |
| `_options` | [`PipelineOptions`](../interfaces/dxos_echo_db.PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:54](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L54)

## Properties

### \_genesisFeedKey

• `Private` `Optional` **\_genesisFeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:52](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L52)

___

### \_invitationManager

• `Private` `Optional` **\_invitationManager**: [`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:49](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L49)

___

### \_partyCore

• `Private` `Readonly` **\_partyCore**: [`PartyPipeline`](dxos_echo_db.PartyPipeline.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:47](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L47)

___

### \_preferences

• `Private` `Optional` `Readonly` **\_preferences**: [`PartyPreferences`](dxos_echo_db.PartyPreferences.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:48](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L48)

___

### \_protocol

• `Private` `Optional` **\_protocol**: [`PartyProtocolFactory`](dxos_echo_db.PartyProtocolFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:50](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L50)

___

### update

• `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:45](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L45)

## Accessors

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:133](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L133)

___

### database

• `get` **database**(): [`Database`](dxos_echo_db.Database.md)

#### Returns

[`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:101](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L101)

___

### genesisFeedKey

• `get` **genesisFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:147](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L147)

___

### invitationManager

• `get` **invitationManager**(): [`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Returns

[`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:128](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L128)

___

### isActive

• `get` **isActive**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:251](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L251)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:97](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L97)

___

### key

• `get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:93](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L93)

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

[packages/echo/echo-db/src/parties/data-party.ts:82](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L82)

___

### pipeline

• `get` **pipeline**(): [`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Returns

[`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:113](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L113)

___

### processor

• `get` **processor**(): [`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Returns

[`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:108](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L108)

___

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:118](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L118)

___

### timeframeUpdate

• `get` **timeframeUpdate**(): `Event`<`Timeframe`\>

#### Returns

`Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:123](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L123)

___

### title

• `get` **title**(): `any`

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:137](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L137)

## Methods

### activate

▸ **activate**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ActivationOptions`](../interfaces/dxos_echo_db.ActivationOptions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:256](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L256)

___

### close

▸ **close**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:223](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L223)

___

### createSnapshot

▸ **createSnapshot**(): `PartySnapshot`

Create a snapshot of the current state.

#### Returns

`PartySnapshot`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:301](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L301)

___

### deactivate

▸ **deactivate**(`options`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ActivationOptions`](../interfaces/dxos_echo_db.ActivationOptions.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:267](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L267)

___

### getFeeds

▸ **getFeeds**(): `FeedDescriptor`[]

#### Returns

`FeedDescriptor`[]

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:247](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L247)

___

### getPropertiesItem

▸ **getPropertiesItem**(): `Promise`<[`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>\>

Returns a special Item that is used by the Party to manage its properties.

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:281](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L281)

___

### getPropertiesSet

▸ **getPropertiesSet**(): [`SelectionResult`](dxos_echo_db.SelectionResult.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

Get the SelectionResult for the Properties Item query.

#### Returns

[`SelectionResult`](dxos_echo_db.SelectionResult.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:293](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L293)

___

### getWriteFeed

▸ **getWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:243](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L243)

___

### open

▸ **open**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Opens the pipeline and connects the streams.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:162](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L162)

___

### queryMembers

▸ **queryMembers**(): [`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

Get all party members.

#### Returns

[`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:312](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L312)

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

[packages/echo/echo-db/src/parties/data-party.ts:305](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L305)

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

[packages/echo/echo-db/src/parties/data-party.ts:141](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/parties/data-party.ts#L141)

---
id: "dxos_echo_db.DataParty"
title: "Class: DataParty"
sidebar_label: "DataParty"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).DataParty

Generic parties that peers create that is capable of storing data in the database.

This class handles data-storage, replication, snapshots, access-control, and invitations.

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

[packages/echo/echo-db/src/parties/data-party.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L53)

## Properties

### \_genesisFeedKey

• `Private` `Optional` **\_genesisFeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L51)

___

### \_invitationManager

• `Private` `Optional` **\_invitationManager**: [`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L48)

___

### \_partyCore

• `Private` `Readonly` **\_partyCore**: [`PartyPipeline`](dxos_echo_db.PartyPipeline.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:46](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L46)

___

### \_preferences

• `Private` `Optional` `Readonly` **\_preferences**: [`PartyPreferences`](dxos_echo_db.PartyPreferences.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:47](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L47)

___

### \_protocol

• `Private` `Optional` **\_protocol**: [`PartyProtocolFactory`](dxos_echo_db.PartyProtocolFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:49](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L49)

___

### update

• `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:44](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L44)

## Accessors

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:132](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L132)

___

### database

• `get` **database**(): [`Database`](dxos_echo_db.Database.md)

#### Returns

[`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:100](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L100)

___

### genesisFeedKey

• `get` **genesisFeedKey**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:146](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L146)

___

### invitationManager

• `get` **invitationManager**(): [`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Returns

[`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:127](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L127)

___

### isActive

• `get` **isActive**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:250](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L250)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:96](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L96)

___

### key

• `get` **key**(): `PublicKey`

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:92](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L92)

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

[packages/echo/echo-db/src/parties/data-party.ts:81](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L81)

___

### pipeline

• `get` **pipeline**(): [`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Returns

[`FeedMuxer`](dxos_echo_db.FeedMuxer.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:112](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L112)

___

### processor

• `get` **processor**(): [`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Returns

[`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:107](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L107)

___

### timeframe

• `get` **timeframe**(): `Timeframe`

#### Returns

`Timeframe`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:117](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L117)

___

### timeframeUpdate

• `get` **timeframeUpdate**(): `Event`<`Timeframe`\>

#### Returns

`Event`<`Timeframe`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:122](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L122)

___

### title

• `get` **title**(): `any`

#### Returns

`any`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:136](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L136)

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

[packages/echo/echo-db/src/parties/data-party.ts:255](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L255)

___

### close

▸ **close**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:222](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L222)

___

### createSnapshot

▸ **createSnapshot**(): `PartySnapshot`

Create a snapshot of the current state.

#### Returns

`PartySnapshot`

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:300](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L300)

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

[packages/echo/echo-db/src/parties/data-party.ts:266](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L266)

___

### getFeeds

▸ **getFeeds**(): `FeedDescriptor`[]

#### Returns

`FeedDescriptor`[]

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:246](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L246)

___

### getPropertiesItem

▸ **getPropertiesItem**(): `Promise`<[`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>\>

Returns a special Item that is used by the Party to manage its properties.

#### Returns

`Promise`<[`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:280](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L280)

___

### getPropertiesSet

▸ **getPropertiesSet**(): [`SelectionResult`](dxos_echo_db.SelectionResult.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

Get the SelectionResult for the Properties Item query.

#### Returns

[`SelectionResult`](dxos_echo_db.SelectionResult.md)<[`Item`](dxos_echo_db.Item.md)<`any`\>, `void`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:292](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L292)

___

### getWriteFeed

▸ **getWriteFeed**(): `Promise`<`FeedDescriptor`\>

#### Returns

`Promise`<`FeedDescriptor`\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:242](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L242)

___

### open

▸ **open**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Opens the pipeline and connects the streams.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:161](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L161)

___

### queryMembers

▸ **queryMembers**(): [`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

Get all party members.

#### Returns

[`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:311](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L311)

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

[packages/echo/echo-db/src/parties/data-party.ts:304](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L304)

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

[packages/echo/echo-db/src/parties/data-party.ts:140](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/parties/data-party.ts#L140)

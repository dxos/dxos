# Module: @dxos/echo-db

## Table of contents

### Enumerations

- [GreetingState](../enums/dxos_echo_db.GreetingState.md)
- [ItemFilterDeleted](../enums/dxos_echo_db.ItemFilterDeleted.md)
- [State](../enums/dxos_echo_db.State.md)

### Classes

- [ContactManager](../classes/dxos_echo_db.ContactManager.md)
- [CredentialsSigner](../classes/dxos_echo_db.CredentialsSigner.md)
- [DataMirror](../classes/dxos_echo_db.DataMirror.md)
- [DataParty](../classes/dxos_echo_db.DataParty.md)
- [DataServiceHost](../classes/dxos_echo_db.DataServiceHost.md)
- [DataServiceRouter](../classes/dxos_echo_db.DataServiceRouter.md)
- [Database](../classes/dxos_echo_db.Database.md)
- [ECHO](../classes/dxos_echo_db.ECHO.md)
- [Entity](../classes/dxos_echo_db.Entity.md)
- [EntityNotFoundError](../classes/dxos_echo_db.EntityNotFoundError.md)
- [FeedDatabaseBackend](../classes/dxos_echo_db.FeedDatabaseBackend.md)
- [FeedMuxer](../classes/dxos_echo_db.FeedMuxer.md)
- [GreetingInitiator](../classes/dxos_echo_db.GreetingInitiator.md)
- [GreetingResponder](../classes/dxos_echo_db.GreetingResponder.md)
- [HALO](../classes/dxos_echo_db.HALO.md)
- [HaloFactory](../classes/dxos_echo_db.HaloFactory.md)
- [HaloParty](../classes/dxos_echo_db.HaloParty.md)
- [HaloRecoveryInitiator](../classes/dxos_echo_db.HaloRecoveryInitiator.md)
- [Identity](../classes/dxos_echo_db.Identity.md)
- [IdentityManager](../classes/dxos_echo_db.IdentityManager.md)
- [IdentityNotInitializedError](../classes/dxos_echo_db.IdentityNotInitializedError.md)
- [InvalidInvitationError](../classes/dxos_echo_db.InvalidInvitationError.md)
- [InvalidStorageVersionError](../classes/dxos_echo_db.InvalidStorageVersionError.md)
- [InvitationDescriptor](../classes/dxos_echo_db.InvitationDescriptor.md)
- [InvitationFactory](../classes/dxos_echo_db.InvitationFactory.md)
- [Item](../classes/dxos_echo_db.Item.md)
- [ItemDemuxer](../classes/dxos_echo_db.ItemDemuxer.md)
- [ItemManager](../classes/dxos_echo_db.ItemManager.md)
- [Link](../classes/dxos_echo_db.Link.md)
- [MetadataStore](../classes/dxos_echo_db.MetadataStore.md)
- [OfflineInvitationClaimer](../classes/dxos_echo_db.OfflineInvitationClaimer.md)
- [PartyFactory](../classes/dxos_echo_db.PartyFactory.md)
- [PartyFeedProvider](../classes/dxos_echo_db.PartyFeedProvider.md)
- [PartyManager](../classes/dxos_echo_db.PartyManager.md)
- [PartyNotFoundError](../classes/dxos_echo_db.PartyNotFoundError.md)
- [PartyPipeline](../classes/dxos_echo_db.PartyPipeline.md)
- [PartyPreferences](../classes/dxos_echo_db.PartyPreferences.md)
- [PartyProcessor](../classes/dxos_echo_db.PartyProcessor.md)
- [PartyProtocolFactory](../classes/dxos_echo_db.PartyProtocolFactory.md)
- [Preferences](../classes/dxos_echo_db.Preferences.md)
- [RemoteDatabaseBackend](../classes/dxos_echo_db.RemoteDatabaseBackend.md)
- [ResultSet](../classes/dxos_echo_db.ResultSet.md)
- [Schema](../classes/dxos_echo_db.Schema.md)
- [Selection](../classes/dxos_echo_db.Selection.md)
- [SelectionResult](../classes/dxos_echo_db.SelectionResult.md)
- [SnapshotStore](../classes/dxos_echo_db.SnapshotStore.md)
- [TimeframeClock](../classes/dxos_echo_db.TimeframeClock.md)
- [UnknownModelError](../classes/dxos_echo_db.UnknownModelError.md)

### Interfaces

- [ActivationOptions](../interfaces/dxos_echo_db.ActivationOptions.md)
- [AddPartyOptions](../interfaces/dxos_echo_db.AddPartyOptions.md)
- [CreateItemOption](../interfaces/dxos_echo_db.CreateItemOption.md)
- [CreateLinkOptions](../interfaces/dxos_echo_db.CreateLinkOptions.md)
- [CreateProfileOptions](../interfaces/dxos_echo_db.CreateProfileOptions.md)
- [CredentialProcessor](../interfaces/dxos_echo_db.CredentialProcessor.md)
- [CredentialsProvider](../interfaces/dxos_echo_db.CredentialsProvider.md)
- [DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md)
- [EchoParams](../interfaces/dxos_echo_db.EchoParams.md)
- [HaloConfiguration](../interfaces/dxos_echo_db.HaloConfiguration.md)
- [HaloCreationOptions](../interfaces/dxos_echo_db.HaloCreationOptions.md)
- [InvitationAuthenticator](../interfaces/dxos_echo_db.InvitationAuthenticator.md)
- [InvitationOptions](../interfaces/dxos_echo_db.InvitationOptions.md)
- [InvitationQueryParameters](../interfaces/dxos_echo_db.InvitationQueryParameters.md)
- [InvitationResult](../interfaces/dxos_echo_db.InvitationResult.md)
- [ItemConstructionOptions](../interfaces/dxos_echo_db.ItemConstructionOptions.md)
- [ItemDemuxerOptions](../interfaces/dxos_echo_db.ItemDemuxerOptions.md)
- [LinkConstructionOptions](../interfaces/dxos_echo_db.LinkConstructionOptions.md)
- [LinkData](../interfaces/dxos_echo_db.LinkData.md)
- [ModelConstructionOptions](../interfaces/dxos_echo_db.ModelConstructionOptions.md)
- [OpenOptions](../interfaces/dxos_echo_db.OpenOptions.md)
- [OpenProgress](../interfaces/dxos_echo_db.OpenProgress.md)
- [PartyFilter](../interfaces/dxos_echo_db.PartyFilter.md)
- [PartyMember](../interfaces/dxos_echo_db.PartyMember.md)
- [PartyStateProvider](../interfaces/dxos_echo_db.PartyStateProvider.md)
- [PipelineOptions](../interfaces/dxos_echo_db.PipelineOptions.md)
- [ProfileInfo](../interfaces/dxos_echo_db.ProfileInfo.md)
- [TestOptions](../interfaces/dxos_echo_db.TestOptions.md)

### Type Aliases

- [Awaited](dxos_echo_db.md#awaited)
- [Callable](dxos_echo_db.md#callable)
- [Contact](dxos_echo_db.md#contact)
- [EchoProcessor](dxos_echo_db.md#echoprocessor)
- [FieldType](dxos_echo_db.md#fieldtype)
- [ItemFilter](dxos_echo_db.md#itemfilter)
- [ItemIdFilter](dxos_echo_db.md#itemidfilter)
- [JoinedParty](dxos_echo_db.md#joinedparty)
- [LinkFilter](dxos_echo_db.md#linkfilter)
- [OneOrMultiple](dxos_echo_db.md#oneormultiple)
- [Predicate](dxos_echo_db.md#predicate)
- [QueryOptions](dxos_echo_db.md#queryoptions)
- [RootFilter](dxos_echo_db.md#rootfilter)
- [SchemaDef](dxos_echo_db.md#schemadef)
- [SchemaField](dxos_echo_db.md#schemafield)
- [SchemaRef](dxos_echo_db.md#schemaref)
- [SelectionContext](dxos_echo_db.md#selectioncontext)
- [SelectionRoot](dxos_echo_db.md#selectionroot)
- [TestPeer](dxos_echo_db.md#testpeer)
- [WithTestMeta](dxos_echo_db.md#withtestmeta)

### Variables

- [CONTACT\_DEBOUNCE\_INTERVAL](dxos_echo_db.md#contact_debounce_interval)
- [HALO\_PARTY\_CONTACT\_LIST\_TYPE](dxos_echo_db.md#halo_party_contact_list_type)
- [HALO\_PARTY\_DESCRIPTOR\_TYPE](dxos_echo_db.md#halo_party_descriptor_type)
- [HALO\_PARTY\_DEVICE\_PREFERENCES\_TYPE](dxos_echo_db.md#halo_party_device_preferences_type)
- [HALO\_PARTY\_PREFERENCES\_TYPE](dxos_echo_db.md#halo_party_preferences_type)
- [PARTY\_ITEM\_TYPE](dxos_echo_db.md#party_item_type)
- [PARTY\_TITLE\_PROPERTY](dxos_echo_db.md#party_title_property)
- [STORAGE\_VERSION](dxos_echo_db.md#storage_version)
- [TYPE\_SCHEMA](dxos_echo_db.md#type_schema)
- [codec](dxos_echo_db.md#codec)
- [defaultInvitationAuthenticator](dxos_echo_db.md#defaultinvitationauthenticator)

### Functions

- [autoPartyOpener](dxos_echo_db.md#autopartyopener)
- [coerceToId](dxos_echo_db.md#coercetoid)
- [createAuthPlugin](dxos_echo_db.md#createauthplugin)
- [createAuthenticator](dxos_echo_db.md#createauthenticator)
- [createAutomaticSnapshots](dxos_echo_db.md#createautomaticsnapshots)
- [createCredentialsProvider](dxos_echo_db.md#createcredentialsprovider)
- [createDataPartyAdmissionMessages](dxos_echo_db.md#createdatapartyadmissionmessages)
- [createHaloPartyAdmissionMessage](dxos_echo_db.md#createhalopartyadmissionmessage)
- [createHaloRecoveryPlugin](dxos_echo_db.md#createhalorecoveryplugin)
- [createInMemoryDatabase](dxos_echo_db.md#createinmemorydatabase)
- [createItemSelection](dxos_echo_db.md#createitemselection)
- [createMessageSelector](dxos_echo_db.md#createmessageselector)
- [createModelTestBench](dxos_echo_db.md#createmodeltestbench)
- [createOfflineInvitationPlugin](dxos_echo_db.md#createofflineinvitationplugin)
- [createQueryOptionsFilter](dxos_echo_db.md#createqueryoptionsfilter)
- [createRemoteDatabaseFromDataServiceHost](dxos_echo_db.md#createremotedatabasefromdataservicehost)
- [createReplicatorPlugin](dxos_echo_db.md#createreplicatorplugin)
- [createSelection](dxos_echo_db.md#createselection)
- [createTestInstance](dxos_echo_db.md#createtestinstance)
- [dedupe](dxos_echo_db.md#dedupe)
- [filterToPredicate](dxos_echo_db.md#filtertopredicate)
- [greetingProtocolProvider](dxos_echo_db.md#greetingprotocolprovider)
- [inviteTestPeer](dxos_echo_db.md#invitetestpeer)
- [itemFilterToPredicate](dxos_echo_db.md#itemfiltertopredicate)
- [linkFilterToPredicate](dxos_echo_db.md#linkfiltertopredicate)
- [log](dxos_echo_db.md#log)
- [messageLogger](dxos_echo_db.md#messagelogger)
- [resultSetToStream](dxos_echo_db.md#resultsettostream)
- [sortItemsTopologically](dxos_echo_db.md#sortitemstopologically)
- [streamToResultSet](dxos_echo_db.md#streamtoresultset)
- [testOneOrMultiple](dxos_echo_db.md#testoneormultiple)

## Type Aliases

### Awaited

Ƭ **Awaited**<`T`\>: `T` extends `Promise`<infer U\> ? `U` : `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:19](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing-factories.ts#L19)

___

### Callable

Ƭ **Callable**<`T`, `R`\>: (`entities`: `T`[], `result`: `R`) => `R`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](../classes/dxos_echo_db.Entity.md) |
| `R` | `R` |

#### Type declaration

▸ (`entities`, `result`): `R`

Visitor callback.
The visitor is passed the current entities and result (accumulator),
which may be modified and returned.

##### Parameters

| Name | Type |
| :------ | :------ |
| `entities` | `T`[] |
| `result` | `R` |

##### Returns

`R`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:38](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L38)

___

### Contact

Ƭ **Contact**: [`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/contact-manager.ts#L17)

___

### EchoProcessor

Ƭ **EchoProcessor**: (`message`: `IEchoStream`) => `Promise`<`void`\>

#### Type declaration

▸ (`message`): `Promise`<`void`\>

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `IEchoStream` |

##### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L25)

___

### FieldType

Ƭ **FieldType**: ``"string"`` \| ``"number"`` \| ``"boolean"`` \| ``"ref"``

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:9](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/schema.ts#L9)

___

### ItemFilter

Ƭ **ItemFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parent?` | `ItemID` \| [`Item`](../classes/dxos_echo_db.Item.md) |
| `type?` | [`OneOrMultiple`](dxos_echo_db.md#oneormultiple)<`string`\> |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:20](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L20)

___

### ItemIdFilter

Ƭ **ItemIdFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `ItemID` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L16)

___

### JoinedParty

Ƭ **JoinedParty**: `Object`

A record in HALO party representing a party that user is currently a member of.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `genesisFeed` | `PublicKey` |
| `partyKey` | `PublicKey` |

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:33](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/halo-party.ts#L33)

___

### LinkFilter

Ƭ **LinkFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `type?` | [`OneOrMultiple`](dxos_echo_db.md#oneormultiple)<`string`\> |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L25)

___

### OneOrMultiple

Ƭ **OneOrMultiple**<`T`\>: `T` \| `T`[]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:9](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/util.ts#L9)

___

### Predicate

Ƭ **Predicate**<`T`\>: (`entity`: `T`) => `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](../classes/dxos_echo_db.Entity.md) |

#### Type declaration

▸ (`entity`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `entity` | `T` |

##### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L29)

___

### QueryOptions

Ƭ **QueryOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `deleted?` | [`ItemFilterDeleted`](../enums/dxos_echo_db.ItemFilterDeleted.md) | Controls how deleted items are filtered. |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:58](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L58)

___

### RootFilter

Ƭ **RootFilter**: [`ItemIdFilter`](dxos_echo_db.md#itemidfilter) \| [`ItemFilter`](dxos_echo_db.md#itemfilter) \| [`Predicate`](dxos_echo_db.md#predicate)<[`Item`](../classes/dxos_echo_db.Item.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L31)

___

### SchemaDef

Ƭ **SchemaDef**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fields` | [`SchemaField`](dxos_echo_db.md#schemafield)[] |
| `schema` | `string` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/schema.ts#L25)

___

### SchemaField

Ƭ **SchemaField**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `ref?` | [`SchemaRef`](dxos_echo_db.md#schemaref) |
| `required` | `boolean` |
| `type?` | [`FieldType`](dxos_echo_db.md#fieldtype) |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/schema.ts#L18)

___

### SchemaRef

Ƭ **SchemaRef**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `field` | `string` |
| `schema` | `string` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:13](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/schema.ts#L13)

___

### SelectionContext

Ƭ **SelectionContext**<`T`, `R`\>: [entities: T[], result?: R]

Returned from each stage of the visitor.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](../classes/dxos_echo_db.Entity.md) |
| `R` | `R` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:21](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/result.ts#L21)

___

### SelectionRoot

Ƭ **SelectionRoot**: [`Database`](../classes/dxos_echo_db.Database.md) \| [`Entity`](../classes/dxos_echo_db.Entity.md)

Represents where the selection has started.

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/result.ts#L16)

___

### TestPeer

Ƭ **TestPeer**: [`Awaited`](dxos_echo_db.md#awaited)<`ReturnType`<typeof [`createTestInstance`](dxos_echo_db.md#createtestinstance)\>\>

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:21](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing-factories.ts#L21)

___

### WithTestMeta

Ƭ **WithTestMeta**<`T`\>: `T` & { `testMeta`: [`TestPeer`](dxos_echo_db.md#testpeer)  }

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing-factories.ts#L23)

## Variables

### CONTACT\_DEBOUNCE\_INTERVAL

• `Const` **CONTACT\_DEBOUNCE\_INTERVAL**: ``500``

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:24](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/parties/party-manager.ts#L24)

___

### HALO\_PARTY\_CONTACT\_LIST\_TYPE

• `Const` **HALO\_PARTY\_CONTACT\_LIST\_TYPE**: ``"dxos:item/halo/contact-list"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:26](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/halo-party.ts#L26)

___

### HALO\_PARTY\_DESCRIPTOR\_TYPE

• `Const` **HALO\_PARTY\_DESCRIPTOR\_TYPE**: ``"dxos:item/halo/party-descriptor"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/halo-party.ts#L25)

___

### HALO\_PARTY\_DEVICE\_PREFERENCES\_TYPE

• `Const` **HALO\_PARTY\_DEVICE\_PREFERENCES\_TYPE**: ``"dxos:item/halo/device/preferences"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:28](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/halo-party.ts#L28)

___

### HALO\_PARTY\_PREFERENCES\_TYPE

• `Const` **HALO\_PARTY\_PREFERENCES\_TYPE**: ``"dxos:item/halo/preferences"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:27](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/halo-party.ts#L27)

___

### PARTY\_ITEM\_TYPE

• `Const` **PARTY\_ITEM\_TYPE**: ``"dxos:item/party"``

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/parties/data-party.ts#L29)

___

### PARTY\_TITLE\_PROPERTY

• `Const` **PARTY\_TITLE\_PROPERTY**: ``"title"``

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/parties/data-party.ts#L31)

___

### STORAGE\_VERSION

• `Const` **STORAGE\_VERSION**: ``1``

Version for the schema of the stored data as defined in dxos.echo.metadata.EchoMetadata.
Should be incremented every time there's a breaking change to the stored data.

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:18](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L18)

___

### TYPE\_SCHEMA

• `Const` **TYPE\_SCHEMA**: ``"dxos:type/schema"``

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:7](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/schema.ts#L7)

___

### codec

• `Const` **codec**: `WithTypeUrl`<`any`\>

#### Defined in

packages/echo/echo-protocol/dist/src/codec.d.ts:2

___

### defaultInvitationAuthenticator

• `Const` **defaultInvitationAuthenticator**: `Required`<[`InvitationAuthenticator`](../interfaces/dxos_echo_db.InvitationAuthenticator.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/common.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/common.ts#L15)

## Functions

### autoPartyOpener

▸ **autoPartyOpener**(`preferences`, `partyManager`): `Unsubscribe`

Automatically adds, opens, and clothes parties from HALO preferences.

#### Parameters

| Name | Type |
| :------ | :------ |
| `preferences` | [`Preferences`](../classes/dxos_echo_db.Preferences.md) |
| `partyManager` | [`PartyManager`](../classes/dxos_echo_db.PartyManager.md) |

#### Returns

`Unsubscribe`

#### Defined in

[packages/echo/echo-db/src/halo/party-opener.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/party-opener.ts#L17)

___

### coerceToId

▸ **coerceToId**(`item`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `string` \| [`Item`](../classes/dxos_echo_db.Item.md)<`Model`<`any`, `any`\>\> |

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:13](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/util.ts#L13)

___

### createAuthPlugin

▸ **createAuthPlugin**(`authenticator`, `peerId`): `AuthPlugin`

Creates authenticator network-protocol plugin that guards access to the replicator.

#### Parameters

| Name | Type |
| :------ | :------ |
| `authenticator` | `Authenticator` |
| `peerId` | `PublicKey` |

#### Returns

`AuthPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/auth-plugin.ts:12](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/protocol/auth-plugin.ts#L12)

___

### createAuthenticator

▸ **createAuthenticator**(`partyProcessor`, `credentialsSigner`, `credentialsWriter`): `Authenticator`

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyProcessor` | [`PartyProcessor`](../classes/dxos_echo_db.PartyProcessor.md) |
| `credentialsSigner` | [`CredentialsSigner`](../classes/dxos_echo_db.CredentialsSigner.md) |
| `credentialsWriter` | `FeedWriter`<`Message`\> |

#### Returns

`Authenticator`

#### Defined in

[packages/echo/echo-db/src/protocol/authenticator.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/protocol/authenticator.ts#L16)

___

### createAutomaticSnapshots

▸ **createAutomaticSnapshots**(`party`, `clock`, `store`, `interval`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`PartyPipeline`](../classes/dxos_echo_db.PartyPipeline.md) |
| `clock` | [`TimeframeClock`](../classes/dxos_echo_db.TimeframeClock.md) |
| `store` | [`SnapshotStore`](../classes/dxos_echo_db.SnapshotStore.md) |
| `interval` | `number` |

#### Returns

`fn`

▸ (): `void`

Register an event listener.

If provided callback was already registered as once-listener, it is made permanent.

##### Returns

`void`

function that unsubscribes this event listener

#### Defined in

[packages/echo/echo-db/src/snapshots/snapshot-generator.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/snapshots/snapshot-generator.ts#L15)

___

### createCredentialsProvider

▸ **createCredentialsProvider**(`credentialsSigner`, `partyKey`, `feedKey`): [`CredentialsProvider`](../interfaces/dxos_echo_db.CredentialsProvider.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](../classes/dxos_echo_db.CredentialsSigner.md) |
| `partyKey` | `PublicKey` |
| `feedKey` | `PublicKey` |

#### Returns

[`CredentialsProvider`](../interfaces/dxos_echo_db.CredentialsProvider.md)

#### Defined in

[packages/echo/echo-db/src/protocol/authenticator.ts:39](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/protocol/authenticator.ts#L39)

___

### createDataPartyAdmissionMessages

▸ **createDataPartyAdmissionMessages**(`credentialsSigner`, `partyKey`, `identityGenesis`, `nonce`): `Message`

Create credentials messages that should be written to invite member to the data party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](../classes/dxos_echo_db.CredentialsSigner.md) |
| `partyKey` | `PublicKey` |
| `identityGenesis` | `SignedMessage` |
| `nonce` | `Uint8Array` |

#### Returns

`Message`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:216](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L216)

___

### createHaloPartyAdmissionMessage

▸ **createHaloPartyAdmissionMessage**(`credentialsSigner`, `nonce`): `Message`

Create credentials messages that should be written to invite new device to the HALO party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](../classes/dxos_echo_db.CredentialsSigner.md) |
| `nonce` | `Uint8Array` |

#### Returns

`Message`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:202](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L202)

___

### createHaloRecoveryPlugin

▸ **createHaloRecoveryPlugin**(`identityKey`, `invitationFactory`, `peerId`): `GreetingCommandPlugin`

Creates network protocol plugin that allows peers to recover access to their HALO.
Plugin is intended to be used in HALO party swarm.

#### Parameters

| Name | Type |
| :------ | :------ |
| `identityKey` | `PublicKey` |
| `invitationFactory` | [`InvitationFactory`](../classes/dxos_echo_db.InvitationFactory.md) |
| `peerId` | `PublicKey` |

#### Returns

`GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/halo-recovery-plugin.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/protocol/halo-recovery-plugin.ts#L15)

___

### createInMemoryDatabase

▸ **createInMemoryDatabase**(`modelFactory`): `Promise`<[`Database`](../classes/dxos_echo_db.Database.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelFactory` | `ModelFactory` |

#### Returns

`Promise`<[`Database`](../classes/dxos_echo_db.Database.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/testing.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/testing.ts#L15)

___

### createItemSelection

▸ **createItemSelection**<`R`\>(`root`, `update`, `value`): [`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

Factory for specific item selector.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `root` | [`Item`](../classes/dxos_echo_db.Item.md)<`any`\> |  |
| `update` | `Event`<[`Entity`](../classes/dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\> |  |
| `value` | `R` | Initial reducer value. |

#### Returns

[`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L60)

___

### createMessageSelector

▸ **createMessageSelector**(`timeframeClock`): `MessageSelector`

The MessageSelector makes sure that we read in a trusted order.
The first message we wish to process is the PartyGenesis, which will admit a Feed.
As we encounter and process FeedAdmit messages those are added to the Party's trust,
and we begin processing messages from them as well.

#### Parameters

| Name | Type |
| :------ | :------ |
| `timeframeClock` | [`TimeframeClock`](../classes/dxos_echo_db.TimeframeClock.md) |

#### Returns

`MessageSelector`

#### Defined in

[packages/echo/echo-db/src/pipeline/message-selector.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/message-selector.ts#L23)

___

### createModelTestBench

▸ **createModelTestBench**<`M`\>(`options`): `Promise`<{ `items`: [`WithTestMeta`](dxos_echo_db.md#withtestmeta)<[`Item`](../classes/dxos_echo_db.Item.md)<`M`\>\>[] ; `peers`: [`ECHO`](../classes/dxos_echo_db.ECHO.md)[]  }\>

Creates a number of test ECHO instances and an item that is shared between all of them.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateItemOption`](../interfaces/dxos_echo_db.CreateItemOption.md)<`M`\> & { `peerCount?`: `number`  } |

#### Returns

`Promise`<{ `items`: [`WithTestMeta`](dxos_echo_db.md#withtestmeta)<[`Item`](../classes/dxos_echo_db.Item.md)<`M`\>\>[] ; `peers`: [`ECHO`](../classes/dxos_echo_db.ECHO.md)[]  }\>

Item instances from each of the peers.

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:56](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing-factories.ts#L56)

___

### createOfflineInvitationPlugin

▸ **createOfflineInvitationPlugin**(`invitationFactory`, `peerId`): `GreetingCommandPlugin`

Creates network protocol plugin that allows peers to claim offline invitations.
Plugin is intended to be used in data-party swarms.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationFactory` | [`InvitationFactory`](../classes/dxos_echo_db.InvitationFactory.md) |
| `peerId` | `PublicKey` |

#### Returns

`GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/offline-invitation-plugin.ts:14](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/protocol/offline-invitation-plugin.ts#L14)

___

### createQueryOptionsFilter

▸ **createQueryOptionsFilter**(`__namedParameters`): [`Predicate`](dxos_echo_db.md#predicate)<[`Entity`](../classes/dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`QueryOptions`](dxos_echo_db.md#queryoptions) |

#### Returns

[`Predicate`](dxos_echo_db.md#predicate)<[`Entity`](../classes/dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:89](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L89)

___

### createRemoteDatabaseFromDataServiceHost

▸ **createRemoteDatabaseFromDataServiceHost**(`modelFactory`, `dataServiceHost`): `Promise`<[`Database`](../classes/dxos_echo_db.Database.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelFactory` | `ModelFactory` |
| `dataServiceHost` | [`DataServiceHost`](../classes/dxos_echo_db.DataServiceHost.md) |

#### Returns

`Promise`<[`Database`](../classes/dxos_echo_db.Database.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/testing.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/testing.ts#L29)

___

### createReplicatorPlugin

▸ **createReplicatorPlugin**(`feedProvider`): `Replicator`

Creates the protocol plugin for feed replication.

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedProvider` | [`PartyFeedProvider`](../classes/dxos_echo_db.PartyFeedProvider.md) |

#### Returns

`Replicator`

#### Defined in

[packages/echo/echo-db/src/protocol/replicator-plugin.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/protocol/replicator-plugin.ts#L16)

___

### createSelection

▸ **createSelection**<`R`\>(`itemsProvider`, `updateEventProvider`, `root`, `filter`, `value`): [`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

Factory for selector that provides a root set of items.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemsProvider` | () => [`Item`](../classes/dxos_echo_db.Item.md)<`Model`<`any`, `any`\>\>[] |  |
| `updateEventProvider` | () => `Event`<[`Entity`](../classes/dxos_echo_db.Entity.md)<`Model`<`any`, `any`\>\>[]\> |  |
| `root` | [`SelectionRoot`](dxos_echo_db.md#selectionroot) |  |
| `filter` | `undefined` \| [`RootFilter`](dxos_echo_db.md#rootfilter) |  |
| `value` | `R` | Initial reducer value. |

#### Returns

[`Selection`](../classes/dxos_echo_db.Selection.md)<[`Item`](../classes/dxos_echo_db.Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:31](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L31)

___

### createTestInstance

▸ **createTestInstance**(`__namedParameters?`): `Promise`<[`ECHO`](../classes/dxos_echo_db.ECHO.md)\>

Creates ECHO instance for testing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`TestOptions`](../interfaces/dxos_echo_db.TestOptions.md) |

#### Returns

`Promise`<[`ECHO`](../classes/dxos_echo_db.ECHO.md)\>

#### Defined in

[packages/echo/echo-db/src/testing/testing.ts:34](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing.ts#L34)

___

### dedupe

▸ **dedupe**<`T`\>(`values`): `T`[]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `values` | `T`[] |

#### Returns

`T`[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:11](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/util.ts#L11)

___

### filterToPredicate

▸ **filterToPredicate**(`filter`): [`Predicate`](dxos_echo_db.md#predicate)<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`ItemIdFilter`](dxos_echo_db.md#itemidfilter) \| [`ItemFilter`](dxos_echo_db.md#itemfilter) \| [`Predicate`](dxos_echo_db.md#predicate)<`any`\> |

#### Returns

[`Predicate`](dxos_echo_db.md#predicate)<`any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:69](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L69)

___

### greetingProtocolProvider

▸ **greetingProtocolProvider**(`rendezvousKey`, `peerId`, `protocolPlugins`): `ProtocolProvider`

Creates a duplex connection with a single peer using a common rendezvous key as topic.

#### Parameters

| Name | Type |
| :------ | :------ |
| `rendezvousKey` | `any` |
| `peerId` | `Uint8Array` \| `Buffer` |
| `protocolPlugins` | `any`[] |

#### Returns

`ProtocolProvider`

swarm

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-protocol-provider.ts:17](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/invitations/greeting-protocol-provider.ts#L17)

___

### inviteTestPeer

▸ **inviteTestPeer**(`party`, `peer`): `Promise`<[`DataParty`](../classes/dxos_echo_db.DataParty.md)\>

Invites a test peer to the party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](../classes/dxos_echo_db.DataParty.md) |
| `peer` | [`ECHO`](../classes/dxos_echo_db.ECHO.md) |

#### Returns

`Promise`<[`DataParty`](../classes/dxos_echo_db.DataParty.md)\>

Party instance on provided test instance.

#### Defined in

[packages/echo/echo-db/src/testing/testing.ts:65](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing.ts#L65)

___

### itemFilterToPredicate

▸ **itemFilterToPredicate**(`filter`): [`Predicate`](dxos_echo_db.md#predicate)<[`Item`](../classes/dxos_echo_db.Item.md)<`Model`<`any`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`ItemIdFilter`](dxos_echo_db.md#itemidfilter) \| [`ItemFilter`](dxos_echo_db.md#itemfilter) |

#### Returns

[`Predicate`](dxos_echo_db.md#predicate)<[`Item`](../classes/dxos_echo_db.Item.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:77](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L77)

___

### linkFilterToPredicate

▸ **linkFilterToPredicate**(`filter`): [`Predicate`](dxos_echo_db.md#predicate)<[`Link`](../classes/dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`LinkFilter`](dxos_echo_db.md#linkfilter) |

#### Returns

[`Predicate`](dxos_echo_db.md#predicate)<[`Link`](../classes/dxos_echo_db.Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:87](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L87)

___

### log

▸ **log**(`formatter`, ...`args`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `formatter` | `any` |
| `...args` | `any`[] |

#### Returns

`void`

#### Defined in

node_modules/.pnpm/@types+debug@4.1.7/node_modules/@types/debug/index.d.ts:44

___

### messageLogger

▸ **messageLogger**(`tag`): (`message`: `any`) => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `tag` | `string` |

#### Returns

`fn`

▸ (`message`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `any` |

##### Returns

`void`

#### Defined in

[packages/echo/echo-db/src/testing/testing.ts:16](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/testing/testing.ts#L16)

___

### resultSetToStream

▸ **resultSetToStream**<`T`, `U`\>(`resultSet`, `map`): `Stream`<`U`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `resultSet` | [`ResultSet`](../classes/dxos_echo_db.ResultSet.md)<`T`\> |
| `map` | (`arg`: `T`[]) => `U` |

#### Returns

`Stream`<`U`\>

#### Defined in

[packages/echo/echo-db/src/api/subscription.ts:10](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/subscription.ts#L10)

___

### sortItemsTopologically

▸ **sortItemsTopologically**(`items`): `ItemSnapshot`[]

Sort based on parents.

#### Parameters

| Name | Type |
| :------ | :------ |
| `items` | `ItemSnapshot`[] |

#### Returns

`ItemSnapshot`[]

#### Defined in

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:192](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L192)

___

### streamToResultSet

▸ **streamToResultSet**<`T`, `U`\>(`stream`, `map`): [`ResultSet`](../classes/dxos_echo_db.ResultSet.md)<`U`\>

#### Type parameters

| Name |
| :------ |
| `T` |
| `U` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `stream` | `Stream`<`T`\> |
| `map` | (`arg?`: `T`) => `U`[] |

#### Returns

[`ResultSet`](../classes/dxos_echo_db.ResultSet.md)<`U`\>

#### Defined in

[packages/echo/echo-db/src/api/subscription.ts:15](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/api/subscription.ts#L15)

___

### testOneOrMultiple

▸ **testOneOrMultiple**<`T`\>(`expected`, `value`): `boolean`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `expected` | [`OneOrMultiple`](dxos_echo_db.md#oneormultiple)<`T`\> |
| `value` | `T` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:21](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/packlets/database/selection/util.ts#L21)

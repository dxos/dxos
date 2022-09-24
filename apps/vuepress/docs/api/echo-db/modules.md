# @dxos/echo-db

## Table of contents

### Enumerations

- [GreetingState](enums/GreetingState.md)
- [ItemFilterDeleted](enums/ItemFilterDeleted.md)
- [State](enums/State.md)

### Classes

- [ContactManager](classes/ContactManager.md)
- [CredentialsSigner](classes/CredentialsSigner.md)
- [DataMirror](classes/DataMirror.md)
- [DataParty](classes/DataParty.md)
- [DataServiceHost](classes/DataServiceHost.md)
- [DataServiceRouter](classes/DataServiceRouter.md)
- [Database](classes/Database.md)
- [ECHO](classes/ECHO.md)
- [Entity](classes/Entity.md)
- [EntityNotFoundError](classes/EntityNotFoundError.md)
- [FeedDatabaseBackend](classes/FeedDatabaseBackend.md)
- [FeedMuxer](classes/FeedMuxer.md)
- [GreetingInitiator](classes/GreetingInitiator.md)
- [GreetingResponder](classes/GreetingResponder.md)
- [HALO](classes/HALO.md)
- [HaloFactory](classes/HaloFactory.md)
- [HaloParty](classes/HaloParty.md)
- [HaloRecoveryInitiator](classes/HaloRecoveryInitiator.md)
- [Identity](classes/Identity.md)
- [IdentityManager](classes/IdentityManager.md)
- [IdentityNotInitializedError](classes/IdentityNotInitializedError.md)
- [InvalidInvitationError](classes/InvalidInvitationError.md)
- [InvalidStorageVersionError](classes/InvalidStorageVersionError.md)
- [InvitationDescriptor](classes/InvitationDescriptor.md)
- [InvitationFactory](classes/InvitationFactory.md)
- [Item](classes/Item.md)
- [ItemDemuxer](classes/ItemDemuxer.md)
- [ItemManager](classes/ItemManager.md)
- [Link](classes/Link.md)
- [MetadataStore](classes/MetadataStore.md)
- [OfflineInvitationClaimer](classes/OfflineInvitationClaimer.md)
- [PartyFactory](classes/PartyFactory.md)
- [PartyFeedProvider](classes/PartyFeedProvider.md)
- [PartyManager](classes/PartyManager.md)
- [PartyNotFoundError](classes/PartyNotFoundError.md)
- [PartyPipeline](classes/PartyPipeline.md)
- [PartyPreferences](classes/PartyPreferences.md)
- [PartyProcessor](classes/PartyProcessor.md)
- [PartyProtocolFactory](classes/PartyProtocolFactory.md)
- [Preferences](classes/Preferences.md)
- [RemoteDatabaseBackend](classes/RemoteDatabaseBackend.md)
- [ResultSet](classes/ResultSet.md)
- [Schema](classes/Schema.md)
- [Selection](classes/Selection.md)
- [SelectionResult](classes/SelectionResult.md)
- [SnapshotStore](classes/SnapshotStore.md)
- [TimeframeClock](classes/TimeframeClock.md)
- [UnknownModelError](classes/UnknownModelError.md)

### Interfaces

- [ActivationOptions](interfaces/ActivationOptions.md)
- [AddPartyOptions](interfaces/AddPartyOptions.md)
- [CreateItemOption](interfaces/CreateItemOption.md)
- [CreateLinkOptions](interfaces/CreateLinkOptions.md)
- [CreateProfileOptions](interfaces/CreateProfileOptions.md)
- [CredentialProcessor](interfaces/CredentialProcessor.md)
- [CredentialsProvider](interfaces/CredentialsProvider.md)
- [DatabaseBackend](interfaces/DatabaseBackend.md)
- [EchoParams](interfaces/EchoParams.md)
- [HaloConfiguration](interfaces/HaloConfiguration.md)
- [HaloCreationOptions](interfaces/HaloCreationOptions.md)
- [InvitationAuthenticator](interfaces/InvitationAuthenticator.md)
- [InvitationOptions](interfaces/InvitationOptions.md)
- [InvitationQueryParameters](interfaces/InvitationQueryParameters.md)
- [InvitationResult](interfaces/InvitationResult.md)
- [ItemConstructionOptions](interfaces/ItemConstructionOptions.md)
- [ItemDemuxerOptions](interfaces/ItemDemuxerOptions.md)
- [LinkConstructionOptions](interfaces/LinkConstructionOptions.md)
- [LinkData](interfaces/LinkData.md)
- [ModelConstructionOptions](interfaces/ModelConstructionOptions.md)
- [OpenOptions](interfaces/OpenOptions.md)
- [OpenProgress](interfaces/OpenProgress.md)
- [PartyFilter](interfaces/PartyFilter.md)
- [PartyMember](interfaces/PartyMember.md)
- [PartyStateProvider](interfaces/PartyStateProvider.md)
- [PipelineOptions](interfaces/PipelineOptions.md)
- [ProfileInfo](interfaces/ProfileInfo.md)
- [TestOptions](interfaces/TestOptions.md)

### Type Aliases

- [Awaited](modules.md#awaited)
- [Callable](modules.md#callable)
- [Contact](modules.md#contact)
- [EchoProcessor](modules.md#echoprocessor)
- [FieldType](modules.md#fieldtype)
- [ItemFilter](modules.md#itemfilter)
- [ItemIdFilter](modules.md#itemidfilter)
- [JoinedParty](modules.md#joinedparty)
- [LinkFilter](modules.md#linkfilter)
- [OneOrMultiple](modules.md#oneormultiple)
- [Predicate](modules.md#predicate)
- [QueryOptions](modules.md#queryoptions)
- [RootFilter](modules.md#rootfilter)
- [SchemaDef](modules.md#schemadef)
- [SchemaField](modules.md#schemafield)
- [SchemaRef](modules.md#schemaref)
- [SelectionContext](modules.md#selectioncontext)
- [SelectionRoot](modules.md#selectionroot)
- [TestPeer](modules.md#testpeer)
- [WithTestMeta](modules.md#withtestmeta)

### Variables

- [CONTACT\_DEBOUNCE\_INTERVAL](modules.md#contact_debounce_interval)
- [HALO\_PARTY\_CONTACT\_LIST\_TYPE](modules.md#halo_party_contact_list_type)
- [HALO\_PARTY\_DESCRIPTOR\_TYPE](modules.md#halo_party_descriptor_type)
- [HALO\_PARTY\_DEVICE\_PREFERENCES\_TYPE](modules.md#halo_party_device_preferences_type)
- [HALO\_PARTY\_PREFERENCES\_TYPE](modules.md#halo_party_preferences_type)
- [PARTY\_ITEM\_TYPE](modules.md#party_item_type)
- [PARTY\_TITLE\_PROPERTY](modules.md#party_title_property)
- [STORAGE\_VERSION](modules.md#storage_version)
- [TYPE\_SCHEMA](modules.md#type_schema)
- [codec](modules.md#codec)
- [defaultInvitationAuthenticator](modules.md#defaultinvitationauthenticator)

### Functions

- [autoPartyOpener](modules.md#autopartyopener)
- [coerceToId](modules.md#coercetoid)
- [createAuthPlugin](modules.md#createauthplugin)
- [createAuthenticator](modules.md#createauthenticator)
- [createAutomaticSnapshots](modules.md#createautomaticsnapshots)
- [createCredentialsProvider](modules.md#createcredentialsprovider)
- [createDataPartyAdmissionMessages](modules.md#createdatapartyadmissionmessages)
- [createHaloPartyAdmissionMessage](modules.md#createhalopartyadmissionmessage)
- [createHaloRecoveryPlugin](modules.md#createhalorecoveryplugin)
- [createInMemoryDatabase](modules.md#createinmemorydatabase)
- [createItemSelection](modules.md#createitemselection)
- [createMessageSelector](modules.md#createmessageselector)
- [createModelTestBench](modules.md#createmodeltestbench)
- [createOfflineInvitationPlugin](modules.md#createofflineinvitationplugin)
- [createQueryOptionsFilter](modules.md#createqueryoptionsfilter)
- [createRemoteDatabaseFromDataServiceHost](modules.md#createremotedatabasefromdataservicehost)
- [createReplicatorPlugin](modules.md#createreplicatorplugin)
- [createSelection](modules.md#createselection)
- [createTestInstance](modules.md#createtestinstance)
- [dedupe](modules.md#dedupe)
- [filterToPredicate](modules.md#filtertopredicate)
- [greetingProtocolProvider](modules.md#greetingprotocolprovider)
- [inviteTestPeer](modules.md#invitetestpeer)
- [itemFilterToPredicate](modules.md#itemfiltertopredicate)
- [linkFilterToPredicate](modules.md#linkfiltertopredicate)
- [log](modules.md#log)
- [messageLogger](modules.md#messagelogger)
- [resultSetToStream](modules.md#resultsettostream)
- [sortItemsTopologically](modules.md#sortitemstopologically)
- [streamToResultSet](modules.md#streamtoresultset)
- [testOneOrMultiple](modules.md#testoneormultiple)

## Type Aliases

### Awaited

Ƭ **Awaited**<`T`\>: `T` extends `Promise`<infer U\> ? `U` : `T`

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:19](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing-factories.ts#L19)

___

### Callable

Ƭ **Callable**<`T`, `R`\>: (`entities`: `T`[], `result`: `R`) => `R`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](classes/Entity.md) |
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

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:38](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L38)

___

### Contact

Ƭ **Contact**: [`PartyMember`](interfaces/PartyMember.md)

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:17](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/contact-manager.ts#L17)

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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:25](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L25)

___

### FieldType

Ƭ **FieldType**: ``"string"`` \| ``"number"`` \| ``"boolean"`` \| ``"ref"``

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:9](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L9)

___

### ItemFilter

Ƭ **ItemFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `parent?` | `ItemID` \| [`Item`](classes/Item.md) |
| `type?` | [`OneOrMultiple`](modules.md#oneormultiple)<`string`\> |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:20](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L20)

___

### ItemIdFilter

Ƭ **ItemIdFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `id` | `ItemID` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:16](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L16)

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

[packages/echo/echo-db/src/halo/halo-party.ts:33](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L33)

___

### LinkFilter

Ƭ **LinkFilter**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `type?` | [`OneOrMultiple`](modules.md#oneormultiple)<`string`\> |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:25](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L25)

___

### OneOrMultiple

Ƭ **OneOrMultiple**<`T`\>: `T` \| `T`[]

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:9](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/util.ts#L9)

___

### Predicate

Ƭ **Predicate**<`T`\>: (`entity`: `T`) => `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](classes/Entity.md) |

#### Type declaration

▸ (`entity`): `boolean`

##### Parameters

| Name | Type |
| :------ | :------ |
| `entity` | `T` |

##### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L29)

___

### QueryOptions

Ƭ **QueryOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `deleted?` | [`ItemFilterDeleted`](enums/ItemFilterDeleted.md) | Controls how deleted items are filtered. |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:58](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L58)

___

### RootFilter

Ƭ **RootFilter**: [`ItemIdFilter`](modules.md#itemidfilter) \| [`ItemFilter`](modules.md#itemfilter) \| [`Predicate`](modules.md#predicate)<[`Item`](classes/Item.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:31](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L31)

___

### SchemaDef

Ƭ **SchemaDef**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fields` | [`SchemaField`](modules.md#schemafield)[] |
| `schema` | `string` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:25](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L25)

___

### SchemaField

Ƭ **SchemaField**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `ref?` | [`SchemaRef`](modules.md#schemaref) |
| `required` | `boolean` |
| `type?` | [`FieldType`](modules.md#fieldtype) |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:18](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L18)

___

### SchemaRef

Ƭ **SchemaRef**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `field` | `string` |
| `schema` | `string` |

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:13](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L13)

___

### SelectionContext

Ƭ **SelectionContext**<`T`, `R`\>: [entities: T[], result?: R]

Returned from each stage of the visitor.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends [`Entity`](classes/Entity.md) |
| `R` | `R` |

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:21](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/result.ts#L21)

___

### SelectionRoot

Ƭ **SelectionRoot**: [`Database`](classes/Database.md) \| [`Entity`](classes/Entity.md)

Represents where the selection has started.

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/result.ts:16](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/result.ts#L16)

___

### TestPeer

Ƭ **TestPeer**: [`Awaited`](modules.md#awaited)<`ReturnType`<typeof [`createTestInstance`](modules.md#createtestinstance)\>\>

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:21](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing-factories.ts#L21)

___

### WithTestMeta

Ƭ **WithTestMeta**<`T`\>: `T` & { `testMeta`: [`TestPeer`](modules.md#testpeer)  }

#### Type parameters

| Name |
| :------ |
| `T` |

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:23](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing-factories.ts#L23)

## Variables

### CONTACT\_DEBOUNCE\_INTERVAL

• `Const` **CONTACT\_DEBOUNCE\_INTERVAL**: ``500``

#### Defined in

[packages/echo/echo-db/src/parties/party-manager.ts:24](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/party-manager.ts#L24)

___

### HALO\_PARTY\_CONTACT\_LIST\_TYPE

• `Const` **HALO\_PARTY\_CONTACT\_LIST\_TYPE**: ``"dxos:item/halo/contact-list"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:26](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L26)

___

### HALO\_PARTY\_DESCRIPTOR\_TYPE

• `Const` **HALO\_PARTY\_DESCRIPTOR\_TYPE**: ``"dxos:item/halo/party-descriptor"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:25](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L25)

___

### HALO\_PARTY\_DEVICE\_PREFERENCES\_TYPE

• `Const` **HALO\_PARTY\_DEVICE\_PREFERENCES\_TYPE**: ``"dxos:item/halo/device/preferences"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:28](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L28)

___

### HALO\_PARTY\_PREFERENCES\_TYPE

• `Const` **HALO\_PARTY\_PREFERENCES\_TYPE**: ``"dxos:item/halo/preferences"``

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L27)

___

### PARTY\_ITEM\_TYPE

• `Const` **PARTY\_ITEM\_TYPE**: ``"dxos:item/party"``

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L29)

___

### PARTY\_TITLE\_PROPERTY

• `Const` **PARTY\_TITLE\_PROPERTY**: ``"title"``

#### Defined in

[packages/echo/echo-db/src/parties/data-party.ts:31](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/parties/data-party.ts#L31)

___

### STORAGE\_VERSION

• `Const` **STORAGE\_VERSION**: ``1``

Version for the schema of the stored data as defined in dxos.echo.metadata.EchoMetadata.
Should be incremented every time there's a breaking change to the stored data.

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:18](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L18)

___

### TYPE\_SCHEMA

• `Const` **TYPE\_SCHEMA**: ``"dxos:type/schema"``

#### Defined in

[packages/echo/echo-db/src/api/schema.ts:7](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/schema.ts#L7)

___

### codec

• `Const` **codec**: `WithTypeUrl`<`any`\>

#### Defined in

packages/echo/echo-protocol/dist/src/codec.d.ts:2

___

### defaultInvitationAuthenticator

• `Const` **defaultInvitationAuthenticator**: `Required`<[`InvitationAuthenticator`](interfaces/InvitationAuthenticator.md)\>

#### Defined in

[packages/echo/echo-db/src/invitations/common.ts:15](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/common.ts#L15)

## Functions

### autoPartyOpener

▸ **autoPartyOpener**(`preferences`, `partyManager`): `Unsubscribe`

Automatically adds, opens, and clothes parties from HALO preferences.

#### Parameters

| Name | Type |
| :------ | :------ |
| `preferences` | [`Preferences`](classes/Preferences.md) |
| `partyManager` | [`PartyManager`](classes/PartyManager.md) |

#### Returns

`Unsubscribe`

#### Defined in

[packages/echo/echo-db/src/halo/party-opener.ts:17](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/party-opener.ts#L17)

___

### coerceToId

▸ **coerceToId**(`item`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `item` | `string` \| [`Item`](classes/Item.md)<`Model`<`any`, `any`\>\> |

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:13](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/util.ts#L13)

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

[packages/echo/echo-db/src/protocol/auth-plugin.ts:12](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/protocol/auth-plugin.ts#L12)

___

### createAuthenticator

▸ **createAuthenticator**(`partyProcessor`, `credentialsSigner`, `credentialsWriter`): `Authenticator`

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyProcessor` | [`PartyProcessor`](classes/PartyProcessor.md) |
| `credentialsSigner` | [`CredentialsSigner`](classes/CredentialsSigner.md) |
| `credentialsWriter` | `FeedWriter`<`Message`\> |

#### Returns

`Authenticator`

#### Defined in

[packages/echo/echo-db/src/protocol/authenticator.ts:16](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/protocol/authenticator.ts#L16)

___

### createAutomaticSnapshots

▸ **createAutomaticSnapshots**(`party`, `clock`, `store`, `interval`): () => `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`PartyPipeline`](classes/PartyPipeline.md) |
| `clock` | [`TimeframeClock`](classes/TimeframeClock.md) |
| `store` | [`SnapshotStore`](classes/SnapshotStore.md) |
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

[packages/echo/echo-db/src/snapshots/snapshot-generator.ts:15](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/snapshots/snapshot-generator.ts#L15)

___

### createCredentialsProvider

▸ **createCredentialsProvider**(`credentialsSigner`, `partyKey`, `feedKey`): [`CredentialsProvider`](interfaces/CredentialsProvider.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](classes/CredentialsSigner.md) |
| `partyKey` | `PublicKey` |
| `feedKey` | `PublicKey` |

#### Returns

[`CredentialsProvider`](interfaces/CredentialsProvider.md)

#### Defined in

[packages/echo/echo-db/src/protocol/authenticator.ts:39](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/protocol/authenticator.ts#L39)

___

### createDataPartyAdmissionMessages

▸ **createDataPartyAdmissionMessages**(`credentialsSigner`, `partyKey`, `identityGenesis`, `nonce`): `Message`

Create credentials messages that should be written to invite member to the data party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](classes/CredentialsSigner.md) |
| `partyKey` | `PublicKey` |
| `identityGenesis` | `SignedMessage` |
| `nonce` | `Uint8Array` |

#### Returns

`Message`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:216](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L216)

___

### createHaloPartyAdmissionMessage

▸ **createHaloPartyAdmissionMessage**(`credentialsSigner`, `nonce`): `Message`

Create credentials messages that should be written to invite new device to the HALO party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `credentialsSigner` | [`CredentialsSigner`](classes/CredentialsSigner.md) |
| `nonce` | `Uint8Array` |

#### Returns

`Message`

#### Defined in

[packages/echo/echo-db/src/invitations/greeting-initiator.ts:202](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-initiator.ts#L202)

___

### createHaloRecoveryPlugin

▸ **createHaloRecoveryPlugin**(`identityKey`, `invitationFactory`, `peerId`): `GreetingCommandPlugin`

Creates network protocol plugin that allows peers to recover access to their HALO.
Plugin is intended to be used in HALO party swarm.

#### Parameters

| Name | Type |
| :------ | :------ |
| `identityKey` | `PublicKey` |
| `invitationFactory` | [`InvitationFactory`](classes/InvitationFactory.md) |
| `peerId` | `PublicKey` |

#### Returns

`GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/halo-recovery-plugin.ts:15](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/protocol/halo-recovery-plugin.ts#L15)

___

### createInMemoryDatabase

▸ **createInMemoryDatabase**(`modelFactory`): `Promise`<[`Database`](classes/Database.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelFactory` | `ModelFactory` |

#### Returns

`Promise`<[`Database`](classes/Database.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/testing.ts:15](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/testing.ts#L15)

___

### createItemSelection

▸ **createItemSelection**<`R`\>(`root`, `update`, `value`): [`Selection`](classes/Selection.md)<[`Item`](classes/Item.md)<`any`\>, `R`\>

Factory for specific item selector.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `root` | [`Item`](classes/Item.md)<`any`\> |  |
| `update` | `Event`<[`Entity`](classes/Entity.md)<`Model`<`any`, `any`\>\>[]\> |  |
| `value` | `R` | Initial reducer value. |

#### Returns

[`Selection`](classes/Selection.md)<[`Item`](classes/Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:60](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L60)

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
| `timeframeClock` | [`TimeframeClock`](classes/TimeframeClock.md) |

#### Returns

`MessageSelector`

#### Defined in

[packages/echo/echo-db/src/pipeline/message-selector.ts:23](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/message-selector.ts#L23)

___

### createModelTestBench

▸ **createModelTestBench**<`M`\>(`options`): `Promise`<{ `items`: [`WithTestMeta`](modules.md#withtestmeta)<[`Item`](classes/Item.md)<`M`\>\>[] ; `peers`: [`ECHO`](classes/ECHO.md)[]  }\>

Creates a number of test ECHO instances and an item that is shared between all of them.

#### Type parameters

| Name | Type |
| :------ | :------ |
| `M` | extends `Model`<`any`, `any`, `M`\> |

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`CreateItemOption`](interfaces/CreateItemOption.md)<`M`\> & { `peerCount?`: `number`  } |

#### Returns

`Promise`<{ `items`: [`WithTestMeta`](modules.md#withtestmeta)<[`Item`](classes/Item.md)<`M`\>\>[] ; `peers`: [`ECHO`](classes/ECHO.md)[]  }\>

Item instances from each of the peers.

#### Defined in

[packages/echo/echo-db/src/testing/testing-factories.ts:56](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing-factories.ts#L56)

___

### createOfflineInvitationPlugin

▸ **createOfflineInvitationPlugin**(`invitationFactory`, `peerId`): `GreetingCommandPlugin`

Creates network protocol plugin that allows peers to claim offline invitations.
Plugin is intended to be used in data-party swarms.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationFactory` | [`InvitationFactory`](classes/InvitationFactory.md) |
| `peerId` | `PublicKey` |

#### Returns

`GreetingCommandPlugin`

#### Defined in

[packages/echo/echo-db/src/protocol/offline-invitation-plugin.ts:14](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/protocol/offline-invitation-plugin.ts#L14)

___

### createQueryOptionsFilter

▸ **createQueryOptionsFilter**(`__namedParameters`): [`Predicate`](modules.md#predicate)<[`Entity`](classes/Entity.md)<`Model`<`any`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`QueryOptions`](modules.md#queryoptions) |

#### Returns

[`Predicate`](modules.md#predicate)<[`Entity`](classes/Entity.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:89](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L89)

___

### createRemoteDatabaseFromDataServiceHost

▸ **createRemoteDatabaseFromDataServiceHost**(`modelFactory`, `dataServiceHost`): `Promise`<[`Database`](classes/Database.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelFactory` | `ModelFactory` |
| `dataServiceHost` | [`DataServiceHost`](classes/DataServiceHost.md) |

#### Returns

`Promise`<[`Database`](classes/Database.md)\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/testing.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/testing.ts#L29)

___

### createReplicatorPlugin

▸ **createReplicatorPlugin**(`feedProvider`): `Replicator`

Creates the protocol plugin for feed replication.

#### Parameters

| Name | Type |
| :------ | :------ |
| `feedProvider` | [`PartyFeedProvider`](classes/PartyFeedProvider.md) |

#### Returns

`Replicator`

#### Defined in

[packages/echo/echo-db/src/protocol/replicator-plugin.ts:16](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/protocol/replicator-plugin.ts#L16)

___

### createSelection

▸ **createSelection**<`R`\>(`itemsProvider`, `updateEventProvider`, `root`, `filter`, `value`): [`Selection`](classes/Selection.md)<[`Item`](classes/Item.md)<`any`\>, `R`\>

Factory for selector that provides a root set of items.

#### Type parameters

| Name |
| :------ |
| `R` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `itemsProvider` | () => [`Item`](classes/Item.md)<`Model`<`any`, `any`\>\>[] |  |
| `updateEventProvider` | () => `Event`<[`Entity`](classes/Entity.md)<`Model`<`any`, `any`\>\>[]\> |  |
| `root` | [`SelectionRoot`](modules.md#selectionroot) |  |
| `filter` | `undefined` \| [`RootFilter`](modules.md#rootfilter) |  |
| `value` | `R` | Initial reducer value. |

#### Returns

[`Selection`](classes/Selection.md)<[`Item`](classes/Item.md)<`any`\>, `R`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/selection.ts:31](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/selection.ts#L31)

___

### createTestInstance

▸ **createTestInstance**(`__namedParameters?`): `Promise`<[`ECHO`](classes/ECHO.md)\>

Creates ECHO instance for testing.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`TestOptions`](interfaces/TestOptions.md) |

#### Returns

`Promise`<[`ECHO`](classes/ECHO.md)\>

#### Defined in

[packages/echo/echo-db/src/testing/testing.ts:34](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing.ts#L34)

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

[packages/echo/echo-db/src/packlets/database/selection/util.ts:11](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/util.ts#L11)

___

### filterToPredicate

▸ **filterToPredicate**(`filter`): [`Predicate`](modules.md#predicate)<`any`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`ItemIdFilter`](modules.md#itemidfilter) \| [`ItemFilter`](modules.md#itemfilter) \| [`Predicate`](modules.md#predicate)<`any`\> |

#### Returns

[`Predicate`](modules.md#predicate)<`any`\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:69](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L69)

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

[packages/echo/echo-db/src/invitations/greeting-protocol-provider.ts:17](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/invitations/greeting-protocol-provider.ts#L17)

___

### inviteTestPeer

▸ **inviteTestPeer**(`party`, `peer`): `Promise`<[`DataParty`](classes/DataParty.md)\>

Invites a test peer to the party.

#### Parameters

| Name | Type |
| :------ | :------ |
| `party` | [`DataParty`](classes/DataParty.md) |
| `peer` | [`ECHO`](classes/ECHO.md) |

#### Returns

`Promise`<[`DataParty`](classes/DataParty.md)\>

Party instance on provided test instance.

#### Defined in

[packages/echo/echo-db/src/testing/testing.ts:65](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing.ts#L65)

___

### itemFilterToPredicate

▸ **itemFilterToPredicate**(`filter`): [`Predicate`](modules.md#predicate)<[`Item`](classes/Item.md)<`Model`<`any`, `any`\>\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`ItemIdFilter`](modules.md#itemidfilter) \| [`ItemFilter`](modules.md#itemfilter) |

#### Returns

[`Predicate`](modules.md#predicate)<[`Item`](classes/Item.md)<`Model`<`any`, `any`\>\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:77](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L77)

___

### linkFilterToPredicate

▸ **linkFilterToPredicate**(`filter`): [`Predicate`](modules.md#predicate)<[`Link`](classes/Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter` | [`LinkFilter`](modules.md#linkfilter) |

#### Returns

[`Predicate`](modules.md#predicate)<[`Link`](classes/Link.md)<`Model`<`any`, `any`\>, `any`, `any`\>\>

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/queries.ts:87](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/queries.ts#L87)

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

[packages/echo/echo-db/src/testing/testing.ts:16](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/testing/testing.ts#L16)

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
| `resultSet` | [`ResultSet`](classes/ResultSet.md)<`T`\> |
| `map` | (`arg`: `T`[]) => `U` |

#### Returns

`Stream`<`U`\>

#### Defined in

[packages/echo/echo-db/src/api/subscription.ts:10](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/subscription.ts#L10)

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

[packages/echo/echo-db/src/packlets/database/item-demuxer.ts:192](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/item-demuxer.ts#L192)

___

### streamToResultSet

▸ **streamToResultSet**<`T`, `U`\>(`stream`, `map`): [`ResultSet`](classes/ResultSet.md)<`U`\>

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

[`ResultSet`](classes/ResultSet.md)<`U`\>

#### Defined in

[packages/echo/echo-db/src/api/subscription.ts:15](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/api/subscription.ts#L15)

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
| `expected` | [`OneOrMultiple`](modules.md#oneormultiple)<`T`\> |
| `value` | `T` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/packlets/database/selection/util.ts:21](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/packlets/database/selection/util.ts#L21)

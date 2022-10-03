# Module: @dxos/echo-db

## Enumerations

- [ItemFilterDeleted](../enums/dxos_echo_db.ItemFilterDeleted.md)
- [State](../enums/dxos_echo_db.State.md)

## Classes

- [DataMirror](../classes/dxos_echo_db.DataMirror.md)
- [DataService](../classes/dxos_echo_db.DataService.md)
- [DataServiceHost](../classes/dxos_echo_db.DataServiceHost.md)
- [Database](../classes/dxos_echo_db.Database.md)
- [Entity](../classes/dxos_echo_db.Entity.md)
- [EntityNotFoundError](../classes/dxos_echo_db.EntityNotFoundError.md)
- [FeedDatabaseBackend](../classes/dxos_echo_db.FeedDatabaseBackend.md)
- [IdentityNotInitializedError](../classes/dxos_echo_db.IdentityNotInitializedError.md)
- [InvalidInvitationError](../classes/dxos_echo_db.InvalidInvitationError.md)
- [InvalidStorageVersionError](../classes/dxos_echo_db.InvalidStorageVersionError.md)
- [Item](../classes/dxos_echo_db.Item.md)
- [ItemDemuxer](../classes/dxos_echo_db.ItemDemuxer.md)
- [ItemManager](../classes/dxos_echo_db.ItemManager.md)
- [Link](../classes/dxos_echo_db.Link.md)
- [MetadataStore](../classes/dxos_echo_db.MetadataStore.md)
- [RemoteDatabaseBackend](../classes/dxos_echo_db.RemoteDatabaseBackend.md)
- [ReplicatorPlugin](../classes/dxos_echo_db.ReplicatorPlugin.md)
- [ResultSet](../classes/dxos_echo_db.ResultSet.md)
- [Schema](../classes/dxos_echo_db.Schema.md)
- [Selection](../classes/dxos_echo_db.Selection.md)
- [SelectionResult](../classes/dxos_echo_db.SelectionResult.md)
- [Space](../classes/dxos_echo_db.Space.md)
- [SpaceManager](../classes/dxos_echo_db.SpaceManager.md)
- [SpaceNotFoundError](../classes/dxos_echo_db.SpaceNotFoundError.md)
- [SpaceProtocol](../classes/dxos_echo_db.SpaceProtocol.md)
- [UnknownModelError](../classes/dxos_echo_db.UnknownModelError.md)

## Interfaces

- [AcceptSpaceOptions](../interfaces/dxos_echo_db.AcceptSpaceOptions.md)
- [AddPartyOptions](../interfaces/dxos_echo_db.AddPartyOptions.md)
- [CreateItemOption](../interfaces/dxos_echo_db.CreateItemOption.md)
- [CreateLinkOptions](../interfaces/dxos_echo_db.CreateLinkOptions.md)
- [DatabaseBackend](../interfaces/dxos_echo_db.DatabaseBackend.md)
- [ItemConstructionOptions](../interfaces/dxos_echo_db.ItemConstructionOptions.md)
- [ItemDemuxerOptions](../interfaces/dxos_echo_db.ItemDemuxerOptions.md)
- [LinkConstructionOptions](../interfaces/dxos_echo_db.LinkConstructionOptions.md)
- [LinkData](../interfaces/dxos_echo_db.LinkData.md)
- [ModelConstructionOptions](../interfaces/dxos_echo_db.ModelConstructionOptions.md)
- [SigningContext](../interfaces/dxos_echo_db.SigningContext.md)
- [SwarmIdentity](../interfaces/dxos_echo_db.SwarmIdentity.md)

## Type Aliases

- [AuthProvider](../types/dxos_echo_db.AuthProvider.md)
- [AuthVerifier](../types/dxos_echo_db.AuthVerifier.md)
- [Callable](../types/dxos_echo_db.Callable.md)
- [EchoProcessor](../types/dxos_echo_db.EchoProcessor.md)
- [FieldType](../types/dxos_echo_db.FieldType.md)
- [ItemFilter](../types/dxos_echo_db.ItemFilter.md)
- [ItemIdFilter](../types/dxos_echo_db.ItemIdFilter.md)
- [LinkFilter](../types/dxos_echo_db.LinkFilter.md)
- [OneOrMultiple](../types/dxos_echo_db.OneOrMultiple.md)
- [Predicate](../types/dxos_echo_db.Predicate.md)
- [QueryOptions](../types/dxos_echo_db.QueryOptions.md)
- [RootFilter](../types/dxos_echo_db.RootFilter.md)
- [SchemaDef](../types/dxos_echo_db.SchemaDef.md)
- [SchemaField](../types/dxos_echo_db.SchemaField.md)
- [SchemaRef](../types/dxos_echo_db.SchemaRef.md)
- [SelectionContext](../types/dxos_echo_db.SelectionContext.md)
- [SelectionRoot](../types/dxos_echo_db.SelectionRoot.md)
- [SpaceParams](../types/dxos_echo_db.SpaceParams.md)

## Variables

- [STORAGE\_VERSION](../variables/dxos_echo_db.STORAGE_VERSION.md)
- [TYPE\_SCHEMA](../variables/dxos_echo_db.TYPE_SCHEMA.md)
- [codec](../variables/dxos_echo_db.codec.md)

## Functions

- [MOCK\_AUTH\_PROVIDER](../functions/dxos_echo_db.MOCK_AUTH_PROVIDER.md)
- [MOCK\_AUTH\_VERIFIER](../functions/dxos_echo_db.MOCK_AUTH_VERIFIER.md)
- [coerceToId](../functions/dxos_echo_db.coerceToId.md)
- [createInMemoryDatabase](../functions/dxos_echo_db.createInMemoryDatabase.md)
- [createItemSelection](../functions/dxos_echo_db.createItemSelection.md)
- [createQueryOptionsFilter](../functions/dxos_echo_db.createQueryOptionsFilter.md)
- [createRemoteDatabaseFromDataServiceHost](../functions/dxos_echo_db.createRemoteDatabaseFromDataServiceHost.md)
- [createSelection](../functions/dxos_echo_db.createSelection.md)
- [dedupe](../functions/dxos_echo_db.dedupe.md)
- [filterToPredicate](../functions/dxos_echo_db.filterToPredicate.md)
- [itemFilterToPredicate](../functions/dxos_echo_db.itemFilterToPredicate.md)
- [linkFilterToPredicate](../functions/dxos_echo_db.linkFilterToPredicate.md)
- [resultSetToStream](../functions/dxos_echo_db.resultSetToStream.md)
- [sortItemsTopologically](../functions/dxos_echo_db.sortItemsTopologically.md)
- [streamToResultSet](../functions/dxos_echo_db.streamToResultSet.md)
- [testOneOrMultiple](../functions/dxos_echo_db.testOneOrMultiple.md)

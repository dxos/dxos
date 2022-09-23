---
id: "dxos_echo_db.ECHO"
title: "Class: ECHO"
sidebar_label: "ECHO"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).ECHO

This is the root object for the ECHO database.
It is used to query and mutate the state of all data accessible to the containing node.
Shared datasets are contained within `Parties` which consists of immutable messages within multiple `Feeds`.
These feeds are replicated across peers in the network and stored in the `FeedStore`.
Parties contain queryable data `Items` which are reconstituted from an ordered stream of mutations by
different `Models`. The `Model` also handles `Item` mutations, which are streamed back to the `FeedStore`.
When opened, `Parties` construct a pair of inbound and outbound pipelines that connects each `Party` specific
`ItemManager` to the `FeedStore`.
Messages are streamed into the pipeline (from the `FeedStore`) in logical order, determined by the
`Timeframe` (which implements a vector clock).

## Constructors

### constructor

• **new ECHO**(`__namedParameters?`)

Creates a new instance of ECHO.
Default will create an in-memory database.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`EchoCreationOptions`](../interfaces/dxos_echo_db.EchoCreationOptions.md) |

#### Defined in

[packages/echo/echo-db/src/echo.ts:106](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L106)

## Properties

### \_dataServiceRouter

• `Private` `Readonly` **\_dataServiceRouter**: [`DataServiceRouter`](dxos_echo_db.DataServiceRouter.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:99](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L99)

___

### \_feedStore

• `Private` `Readonly` **\_feedStore**: `FeedStore`

#### Defined in

[packages/echo/echo-db/src/echo.ts:94](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L94)

___

### \_halo

• `Private` `Readonly` **\_halo**: [`HALO`](dxos_echo_db.HALO.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:89](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L89)

___

### \_keyring

• `Private` `Readonly` **\_keyring**: `Keyring`

#### Defined in

[packages/echo/echo-db/src/echo.ts:86](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L86)

___

### \_metadataStore

• `Private` `Readonly` **\_metadataStore**: [`MetadataStore`](dxos_echo_db.MetadataStore.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:98](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L98)

___

### \_modelFactory

• `Private` `Readonly` **\_modelFactory**: `ModelFactory`

#### Defined in

[packages/echo/echo-db/src/echo.ts:95](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L95)

___

### \_networkManager

• `Private` `Readonly` **\_networkManager**: `NetworkManager`

#### Defined in

[packages/echo/echo-db/src/echo.ts:96](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L96)

___

### \_partyManager

• `Private` `Readonly` **\_partyManager**: [`PartyManager`](dxos_echo_db.PartyManager.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:90](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L90)

___

### \_snapshotStore

• `Private` `Readonly` **\_snapshotStore**: [`SnapshotStore`](dxos_echo_db.SnapshotStore.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:97](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L97)

___

### \_storage

• `Private` `Readonly` **\_storage**: `Storage`

#### Defined in

[packages/echo/echo-db/src/echo.ts:93](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L93)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/echo/echo-db/src/echo.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L91)

## Accessors

### dataService

• `get` **dataService**(): `DataService`

#### Returns

`DataService`

#### Defined in

[packages/echo/echo-db/src/echo.ts:220](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L220)

___

### feedStore

• `get` **feedStore**(): `FeedStore`

#### Returns

`FeedStore`

#### Defined in

[packages/echo/echo-db/src/echo.ts:208](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L208)

___

### halo

• `get` **halo**(): [`HALO`](dxos_echo_db.HALO.md)

#### Returns

[`HALO`](dxos_echo_db.HALO.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:199](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L199)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/echo.ts:195](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L195)

___

### modelFactory

• `get` **modelFactory**(): `ModelFactory`

#### Returns

`ModelFactory`

#### Defined in

[packages/echo/echo-db/src/echo.ts:216](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L216)

___

### networkManager

• `get` **networkManager**(): `NetworkManager`

#### Returns

`NetworkManager`

#### Defined in

[packages/echo/echo-db/src/echo.ts:212](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L212)

___

### snapshotStore

• `get` **snapshotStore**(): [`SnapshotStore`](dxos_echo_db.SnapshotStore.md)

#### Returns

[`SnapshotStore`](dxos_echo_db.SnapshotStore.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:224](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L224)

## Methods

### cloneParty

▸ **cloneParty**(`snapshot`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Clones an existing party from a snapshot.

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:309](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L309)

___

### close

▸ **close**(): `Promise`<`void`\>

Closes the ECHO instance.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:255](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L255)

___

### createParty

▸ **createParty**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Creates a new party.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:297](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L297)

___

### getParty

▸ **getParty**(`partyKey`): `undefined` \| [`DataParty`](dxos_echo_db.DataParty.md)

Returns an individual party by it's key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`undefined` \| [`DataParty`](dxos_echo_db.DataParty.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:321](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L321)

___

### info

▸ **info**(): `Object`

#### Returns

`Object`

| Name | Type |
| :------ | :------ |
| `open` | `boolean` |
| `parties` | `number` |

#### Defined in

[packages/echo/echo-db/src/echo.ts:188](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L188)

___

### joinParty

▸ **joinParty**(`invitationDescriptor`, `secretProvider?`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Joins a party that was created by another peer and starts replicating with it.

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) | Invitation descriptor passed from another peer. |
| `secretProvider?` | `SecretProvider` | Shared secret provider, the other peer creating the invitation must have the same secret. |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:367](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L367)

___

### open

▸ **open**(`onProgressCallback?`): `Promise`<`void`\>

Opens the ECHO instance and reads the saved state from storage.

Previously active parties will be opened and will begin replication.

#### Parameters

| Name | Type |
| :------ | :------ |
| `onProgressCallback?` | (`progress`: [`OpenProgress`](../interfaces/dxos_echo_db.OpenProgress.md)) => `void` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:233](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L233)

___

### queryParties

▸ **queryParties**(`filter?`): [`ResultSet`](dxos_echo_db.ResultSet.md)<[`DataParty`](dxos_echo_db.DataParty.md)\>

Queries for a set of Parties matching the optional filter.

#### Parameters

| Name | Type |
| :------ | :------ |
| `filter?` | [`PartyFilter`](../interfaces/dxos_echo_db.PartyFilter.md) |

#### Returns

[`ResultSet`](dxos_echo_db.ResultSet.md)<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:334](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L334)

___

### reset

▸ **reset**(): `Promise`<`void`\>

Removes all data and closes this ECHO instance.
The instance will be in an unusable state at this point and a page refresh is recommended.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:276](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L276)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/echo.ts:184](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/echo.ts#L184)

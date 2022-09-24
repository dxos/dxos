# Class: ECHO

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

## Table of contents

### Constructors

- [constructor](dxos_echo_db.ECHO.md#constructor)

### Properties

- [\_dataServiceRouter](dxos_echo_db.ECHO.md#_dataservicerouter)
- [\_feedStore](dxos_echo_db.ECHO.md#_feedstore)
- [\_halo](dxos_echo_db.ECHO.md#_halo)
- [\_keyring](dxos_echo_db.ECHO.md#_keyring)
- [\_metadataStore](dxos_echo_db.ECHO.md#_metadatastore)
- [\_modelFactory](dxos_echo_db.ECHO.md#_modelfactory)
- [\_networkManager](dxos_echo_db.ECHO.md#_networkmanager)
- [\_partyManager](dxos_echo_db.ECHO.md#_partymanager)
- [\_snapshotStore](dxos_echo_db.ECHO.md#_snapshotstore)
- [\_storage](dxos_echo_db.ECHO.md#_storage)
- [\_subscriptions](dxos_echo_db.ECHO.md#_subscriptions)

### Accessors

- [dataService](dxos_echo_db.ECHO.md#dataservice)
- [feedStore](dxos_echo_db.ECHO.md#feedstore)
- [halo](dxos_echo_db.ECHO.md#halo)
- [isOpen](dxos_echo_db.ECHO.md#isopen)
- [modelFactory](dxos_echo_db.ECHO.md#modelfactory)
- [networkManager](dxos_echo_db.ECHO.md#networkmanager)
- [snapshotStore](dxos_echo_db.ECHO.md#snapshotstore)

### Methods

- [cloneParty](dxos_echo_db.ECHO.md#cloneparty)
- [close](dxos_echo_db.ECHO.md#close)
- [createParty](dxos_echo_db.ECHO.md#createparty)
- [getParty](dxos_echo_db.ECHO.md#getparty)
- [info](dxos_echo_db.ECHO.md#info)
- [joinParty](dxos_echo_db.ECHO.md#joinparty)
- [open](dxos_echo_db.ECHO.md#open)
- [queryParties](dxos_echo_db.ECHO.md#queryparties)
- [reset](dxos_echo_db.ECHO.md#reset)
- [toString](dxos_echo_db.ECHO.md#tostring)

## Constructors

### constructor

• **new ECHO**(`__namedParameters?`)

Creates a new instance of ECHO.
Default will create an in-memory database.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | [`EchoParams`](../interfaces/dxos_echo_db.EchoParams.md) |

#### Defined in

[packages/echo/echo-db/src/echo.ts:113](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L113)

## Properties

### \_dataServiceRouter

• `Private` `Readonly` **\_dataServiceRouter**: [`DataServiceRouter`](dxos_echo_db.DataServiceRouter.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:106](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L106)

___

### \_feedStore

• `Private` `Readonly` **\_feedStore**: `FeedStore`

#### Defined in

[packages/echo/echo-db/src/echo.ts:101](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L101)

___

### \_halo

• `Private` `Readonly` **\_halo**: [`HALO`](dxos_echo_db.HALO.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:96](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L96)

___

### \_keyring

• `Private` `Readonly` **\_keyring**: `Keyring`

#### Defined in

[packages/echo/echo-db/src/echo.ts:93](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L93)

___

### \_metadataStore

• `Private` `Readonly` **\_metadataStore**: [`MetadataStore`](dxos_echo_db.MetadataStore.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:105](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L105)

___

### \_modelFactory

• `Private` `Readonly` **\_modelFactory**: `ModelFactory`

#### Defined in

[packages/echo/echo-db/src/echo.ts:102](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L102)

___

### \_networkManager

• `Private` `Readonly` **\_networkManager**: `NetworkManager`

#### Defined in

[packages/echo/echo-db/src/echo.ts:103](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L103)

___

### \_partyManager

• `Private` `Readonly` **\_partyManager**: [`PartyManager`](dxos_echo_db.PartyManager.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:97](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L97)

___

### \_snapshotStore

• `Private` `Readonly` **\_snapshotStore**: [`SnapshotStore`](dxos_echo_db.SnapshotStore.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:104](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L104)

___

### \_storage

• `Private` `Readonly` **\_storage**: `Storage`

#### Defined in

[packages/echo/echo-db/src/echo.ts:100](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L100)

___

### \_subscriptions

• `Private` `Readonly` **\_subscriptions**: `SubscriptionGroup`

#### Defined in

[packages/echo/echo-db/src/echo.ts:98](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L98)

## Accessors

### dataService

• `get` **dataService**(): `DataService`

#### Returns

`DataService`

#### Defined in

[packages/echo/echo-db/src/echo.ts:232](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L232)

___

### feedStore

• `get` **feedStore**(): `FeedStore`

#### Returns

`FeedStore`

#### Defined in

[packages/echo/echo-db/src/echo.ts:220](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L220)

___

### halo

• `get` **halo**(): [`HALO`](dxos_echo_db.HALO.md)

#### Returns

[`HALO`](dxos_echo_db.HALO.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:211](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L211)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/echo.ts:207](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L207)

___

### modelFactory

• `get` **modelFactory**(): `ModelFactory`

#### Returns

`ModelFactory`

#### Defined in

[packages/echo/echo-db/src/echo.ts:228](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L228)

___

### networkManager

• `get` **networkManager**(): `NetworkManager`

#### Returns

`NetworkManager`

#### Defined in

[packages/echo/echo-db/src/echo.ts:224](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L224)

___

### snapshotStore

• `get` **snapshotStore**(): [`SnapshotStore`](dxos_echo_db.SnapshotStore.md)

#### Returns

[`SnapshotStore`](dxos_echo_db.SnapshotStore.md)

#### Defined in

[packages/echo/echo-db/src/echo.ts:236](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L236)

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

[packages/echo/echo-db/src/echo.ts:321](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L321)

___

### close

▸ **close**(): `Promise`<`void`\>

Closes the ECHO instance.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:267](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L267)

___

### createParty

▸ **createParty**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Creates a new party.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:309](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L309)

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

[packages/echo/echo-db/src/echo.ts:333](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L333)

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

[packages/echo/echo-db/src/echo.ts:200](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L200)

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

[packages/echo/echo-db/src/echo.ts:379](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L379)

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

[packages/echo/echo-db/src/echo.ts:245](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L245)

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

[packages/echo/echo-db/src/echo.ts:346](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L346)

___

### reset

▸ **reset**(): `Promise`<`void`\>

Removes all data and closes this ECHO instance.
The instance will be in an unusable state at this point and a page refresh is recommended.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/echo.ts:288](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L288)

___

### toString

▸ **toString**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/echo.ts:196](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/echo.ts#L196)

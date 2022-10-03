# Class: PartyFactory

[@dxos/echo-db](../modules/dxos_echo_db.md).PartyFactory

Creates and constructs party instances.

## Constructors

### constructor

**new PartyFactory**(`_identityProvider`, `_networkManager`, `_modelFactory`, `_snapshotStore`, `_feedProviderFactory`, `_metadataStore`, `_options?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_identityProvider` | `Provider`<`undefined` \| `IdentityCredentials`\> |
| `_networkManager` | `NetworkManager` |
| `_modelFactory` | `ModelFactory` |
| `_snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_feedProviderFactory` | (`partyKey`: `PublicKey`) => [`PartyFeedProvider`](dxos_echo_db.PartyFeedProvider.md) |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_options` | [`PipelineOptions`](../interfaces/dxos_echo_db.PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:42](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-factory.ts#L42)

## Methods

### cloneParty

**cloneParty**(`snapshot`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:201](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-factory.ts#L201)

___

### constructParty

**constructParty**(`partyKey`, `initialTimeframe?`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Constructs a party object from an existing set of feeds.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `initialTimeframe?` | `Timeframe` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:119](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-factory.ts#L119)

___

### constructPartyFromSnapshot

**constructPartyFromSnapshot**(`snapshot`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `snapshot` | `PartySnapshot` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:141](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-factory.ts#L141)

___

### createParty

**createParty**(): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

Create a new party with a new feed for it. Writes a party genensis message to this feed.

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:55](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-factory.ts#L55)

___

### joinParty

**joinParty**(`invitationDescriptor`, `secretProvider`): `Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`DataParty`](dxos_echo_db.DataParty.md)\>

#### Defined in

[packages/echo/echo-db/src/parties/party-factory.ts:150](https://github.com/dxos/dxos/blob/main/packages/echo/echo-db/src/parties/party-factory.ts#L150)

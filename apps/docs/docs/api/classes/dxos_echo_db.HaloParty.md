---
id: "dxos_echo_db.HaloParty"
title: "Class: HaloParty"
sidebar_label: "HaloParty"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).HaloParty

Provides all HALO-related functionality.

## Constructors

### constructor

• **new HaloParty**(`modelFactory`, `snapshotStore`, `_feedProvider`, `_credentialsSigner`, `_networkManager`, `_initialTimeframe`, `_options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelFactory` | `ModelFactory` |
| `snapshotStore` | [`SnapshotStore`](dxos_echo_db.SnapshotStore.md) |
| `_feedProvider` | [`PartyFeedProvider`](dxos_echo_db.PartyFeedProvider.md) |
| `_credentialsSigner` | [`CredentialsSigner`](dxos_echo_db.CredentialsSigner.md) |
| `_networkManager` | `NetworkManager` |
| `_initialTimeframe` | `undefined` \| `Timeframe` |
| `_options` | [`PipelineOptions`](../interfaces/dxos_echo_db.PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:53](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L53)

## Properties

### \_contactManager

• `Private` `Readonly` **\_contactManager**: [`ContactManager`](dxos_echo_db.ContactManager.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:48](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L48)

___

### \_genesisFeedKey

• `Private` `Optional` **\_genesisFeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:51](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L51)

___

### \_invitationManager

• `Private` `Optional` **\_invitationManager**: [`InvitationFactory`](dxos_echo_db.InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:45](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L45)

___

### \_partyCore

• `Private` `Readonly` **\_partyCore**: [`PartyPipeline`](dxos_echo_db.PartyPipeline.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:44](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L44)

___

### \_preferences

• `Private` `Readonly` **\_preferences**: [`Preferences`](dxos_echo_db.Preferences.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:49](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L49)

___

### \_protocol

• `Private` `Optional` **\_protocol**: [`PartyProtocolFactory`](dxos_echo_db.PartyProtocolFactory.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:46](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L46)

___

### update

• `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:42](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L42)

## Accessors

### contacts

• `get` **contacts**(): [`ContactManager`](dxos_echo_db.ContactManager.md)

#### Returns

[`ContactManager`](dxos_echo_db.ContactManager.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:91](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L91)

___

### credentialMessages

• `get` **credentialMessages**(): `Map`<`string`, `SignedMessage`\>

#### Returns

`Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:117](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L117)

___

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:125](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L125)

___

### database

• `get` **database**(): [`Database`](dxos_echo_db.Database.md)

#### Returns

[`Database`](dxos_echo_db.Database.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:100](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L100)

___

### feedKeys

• `get` **feedKeys**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:121](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L121)

___

### identityGenesis

• `get` **identityGenesis**(): `undefined` \| `SignedMessage`

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:113](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L113)

___

### identityInfo

• `get` **identityInfo**(): `undefined` \| `SignedMessage`

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:109](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L109)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:87](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L87)

___

### key

• `get` **key**(): `PublicKey`

Party key.
Always equal to the identity key.

**`Deprecated`**

Should remove.

#### Returns

`PublicKey`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:83](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L83)

___

### preferences

• `get` **preferences**(): [`Preferences`](dxos_echo_db.Preferences.md)

#### Returns

[`Preferences`](dxos_echo_db.Preferences.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:95](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L95)

___

### processor

• `get` **processor**(): [`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Returns

[`PartyProcessor`](dxos_echo_db.PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:134](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L134)

## Methods

### close

▸ **close**(): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:203](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L203)

___

### createInvitation

▸ **createInvitation**(`authenticationDetails`, `options?`): `Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `authenticationDetails` | [`InvitationAuthenticator`](../interfaces/dxos_echo_db.InvitationAuthenticator.md) |
| `options?` | [`InvitationOptions`](../interfaces/dxos_echo_db.InvitationOptions.md) |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:220](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L220)

___

### getWriteFeedKey

▸ **getWriteFeedKey**(): `Promise`<`PublicKey`\>

#### Returns

`Promise`<`PublicKey`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:129](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L129)

___

### open

▸ **open**(): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Opens the pipeline and connects the streams.

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:148](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/halo-party.ts#L148)

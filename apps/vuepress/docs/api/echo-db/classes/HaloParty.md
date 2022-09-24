# Class: HaloParty

Provides all HALO-related functionality.

## Table of contents

### Constructors

- [constructor](HaloParty.md#constructor)

### Properties

- [\_contactManager](HaloParty.md#_contactmanager)
- [\_genesisFeedKey](HaloParty.md#_genesisfeedkey)
- [\_invitationManager](HaloParty.md#_invitationmanager)
- [\_partyCore](HaloParty.md#_partycore)
- [\_preferences](HaloParty.md#_preferences)
- [\_protocol](HaloParty.md#_protocol)
- [update](HaloParty.md#update)

### Accessors

- [contacts](HaloParty.md#contacts)
- [credentialMessages](HaloParty.md#credentialmessages)
- [credentialsWriter](HaloParty.md#credentialswriter)
- [database](HaloParty.md#database)
- [feedKeys](HaloParty.md#feedkeys)
- [identityGenesis](HaloParty.md#identitygenesis)
- [identityInfo](HaloParty.md#identityinfo)
- [isOpen](HaloParty.md#isopen)
- [key](HaloParty.md#key)
- [preferences](HaloParty.md#preferences)
- [processor](HaloParty.md#processor)

### Methods

- [close](HaloParty.md#close)
- [createInvitation](HaloParty.md#createinvitation)
- [getWriteFeedKey](HaloParty.md#getwritefeedkey)
- [open](HaloParty.md#open)

## Constructors

### constructor

• **new HaloParty**(`modelFactory`, `snapshotStore`, `_feedProvider`, `_credentialsSigner`, `_networkManager`, `_initialTimeframe`, `_options`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `modelFactory` | `ModelFactory` |
| `snapshotStore` | [`SnapshotStore`](SnapshotStore.md) |
| `_feedProvider` | [`PartyFeedProvider`](PartyFeedProvider.md) |
| `_credentialsSigner` | [`CredentialsSigner`](CredentialsSigner.md) |
| `_networkManager` | `NetworkManager` |
| `_initialTimeframe` | `undefined` \| `Timeframe` |
| `_options` | [`PipelineOptions`](../interfaces/PipelineOptions.md) |

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:53](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L53)

## Properties

### \_contactManager

• `Private` `Readonly` **\_contactManager**: [`ContactManager`](ContactManager.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:48](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L48)

___

### \_genesisFeedKey

• `Private` `Optional` **\_genesisFeedKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:51](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L51)

___

### \_invitationManager

• `Private` `Optional` **\_invitationManager**: [`InvitationFactory`](InvitationFactory.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:45](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L45)

___

### \_partyCore

• `Private` `Readonly` **\_partyCore**: [`PartyPipeline`](PartyPipeline.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:44](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L44)

___

### \_preferences

• `Private` `Readonly` **\_preferences**: [`Preferences`](Preferences.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L49)

___

### \_protocol

• `Private` `Optional` **\_protocol**: [`PartyProtocolFactory`](PartyProtocolFactory.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:46](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L46)

___

### update

• `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:42](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L42)

## Accessors

### contacts

• `get` **contacts**(): [`ContactManager`](ContactManager.md)

#### Returns

[`ContactManager`](ContactManager.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:91](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L91)

___

### credentialMessages

• `get` **credentialMessages**(): `Map`<`string`, `SignedMessage`\>

#### Returns

`Map`<`string`, `SignedMessage`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:117](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L117)

___

### credentialsWriter

• `get` **credentialsWriter**(): `FeedWriter`<`Message`\>

#### Returns

`FeedWriter`<`Message`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:125](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L125)

___

### database

• `get` **database**(): [`Database`](Database.md)

#### Returns

[`Database`](Database.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:100](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L100)

___

### feedKeys

• `get` **feedKeys**(): `PublicKey`[]

#### Returns

`PublicKey`[]

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:121](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L121)

___

### identityGenesis

• `get` **identityGenesis**(): `undefined` \| `SignedMessage`

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:113](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L113)

___

### identityInfo

• `get` **identityInfo**(): `undefined` \| `SignedMessage`

#### Returns

`undefined` \| `SignedMessage`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:109](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L109)

___

### isOpen

• `get` **isOpen**(): `boolean`

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:87](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L87)

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

[packages/echo/echo-db/src/halo/halo-party.ts:83](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L83)

___

### preferences

• `get` **preferences**(): [`Preferences`](Preferences.md)

#### Returns

[`Preferences`](Preferences.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:95](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L95)

___

### processor

• `get` **processor**(): [`PartyProcessor`](PartyProcessor.md)

#### Returns

[`PartyProcessor`](PartyProcessor.md)

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:134](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L134)

## Methods

### close

▸ **close**(): `Promise`<[`HaloParty`](HaloParty.md)\>

Closes the pipeline and streams.

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:203](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L203)

___

### createInvitation

▸ **createInvitation**(`authenticationDetails`, `options?`): `Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `authenticationDetails` | [`InvitationAuthenticator`](../interfaces/InvitationAuthenticator.md) |
| `options?` | [`InvitationOptions`](../interfaces/InvitationOptions.md) |

#### Returns

`Promise`<[`InvitationDescriptor`](InvitationDescriptor.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:220](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L220)

___

### getWriteFeedKey

▸ **getWriteFeedKey**(): `Promise`<`PublicKey`\>

#### Returns

`Promise`<`PublicKey`\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:129](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L129)

___

### open

▸ **open**(): `Promise`<[`HaloParty`](HaloParty.md)\>

Opens the pipeline and connects the streams.

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/halo-party.ts:148](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/halo-party.ts#L148)

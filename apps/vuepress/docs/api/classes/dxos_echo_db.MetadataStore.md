# Class: MetadataStore

[@dxos/echo-db](../modules/dxos_echo_db.md).MetadataStore

## Table of contents

### Constructors

- [constructor](dxos_echo_db.MetadataStore.md#constructor)

### Properties

- [\_metadata](dxos_echo_db.MetadataStore.md#_metadata)

### Accessors

- [parties](dxos_echo_db.MetadataStore.md#parties)
- [version](dxos_echo_db.MetadataStore.md#version)

### Methods

- [\_save](dxos_echo_db.MetadataStore.md#_save)
- [addParty](dxos_echo_db.MetadataStore.md#addparty)
- [addPartyFeed](dxos_echo_db.MetadataStore.md#addpartyfeed)
- [clear](dxos_echo_db.MetadataStore.md#clear)
- [getParty](dxos_echo_db.MetadataStore.md#getparty)
- [hasFeed](dxos_echo_db.MetadataStore.md#hasfeed)
- [load](dxos_echo_db.MetadataStore.md#load)
- [setDataFeed](dxos_echo_db.MetadataStore.md#setdatafeed)
- [setGenesisFeed](dxos_echo_db.MetadataStore.md#setgenesisfeed)
- [setTimeframe](dxos_echo_db.MetadataStore.md#settimeframe)

## Constructors

### constructor

• **new MetadataStore**(`_directory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_directory` | `Directory` |

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:37](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L37)

## Properties

### \_metadata

• `Private` **\_metadata**: `EchoMetadata`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:35](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L35)

## Accessors

### parties

• `get` **parties**(): `PartyMetadata`[]

Returns a list of currently saved parties. The list and objects in it can be modified addParty and
addPartyFeed functions.

#### Returns

`PartyMetadata`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:49](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L49)

___

### version

• `get` **version**(): `number`

#### Returns

`number`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:41](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L41)

## Methods

### \_save

▸ `Private` **_save**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:85](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L85)

___

### addParty

▸ **addParty**(`partyKey`): `Promise`<`void`\>

Adds new party to store and saves it in persistent storage.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:122](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L122)

___

### addPartyFeed

▸ **addPartyFeed**(`partyKey`, `feedKey`): `Promise`<`void`\>

Adds feed key to the party specified by public key and saves updated data in persistent storage.
Creates party if it doesn't exist. Does nothing if party already has feed with given key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `feedKey` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:138](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L138)

___

### clear

▸ **clear**(): `Promise`<`void`\>

Clears storage - doesn't work for now.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:114](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L114)

___

### getParty

▸ **getParty**(`partyKey`): `undefined` \| `PartyMetadata`

Returns party with given public key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |

#### Returns

`undefined` \| `PartyMetadata`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:178](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L178)

___

### hasFeed

▸ **hasFeed**(`partyKey`, `feedKey`): `boolean`

Checks if a party with given key has a feed with given key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `feedKey` | `PublicKey` |

#### Returns

`boolean`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:185](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L185)

___

### load

▸ **load**(): `Promise`<`void`\>

Loads metadata from persistent storage.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:56](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L56)

___

### setDataFeed

▸ **setDataFeed**(`partyKey`, `feedKey`): `Promise`<`void`\>

Sets the data feed key in the party specified by public key and saves updated data in persistent storage.
Update party's feed list.
Creates party if it doesn't exist. Does nothing if party already has feed with given key.

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `feedKey` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:168](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L168)

___

### setGenesisFeed

▸ **setGenesisFeed**(`partyKey`, `feedKey`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `feedKey` | `PublicKey` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:155](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L155)

___

### setTimeframe

▸ **setTimeframe**(`partyKey`, `timeframe`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `partyKey` | `PublicKey` |
| `timeframe` | `Timeframe` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:193](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/pipeline/metadata-store.ts#L193)

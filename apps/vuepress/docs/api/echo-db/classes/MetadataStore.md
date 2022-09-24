# Class: MetadataStore

## Table of contents

### Constructors

- [constructor](MetadataStore.md#constructor)

### Properties

- [\_metadata](MetadataStore.md#_metadata)

### Accessors

- [parties](MetadataStore.md#parties)
- [version](MetadataStore.md#version)

### Methods

- [\_save](MetadataStore.md#_save)
- [addParty](MetadataStore.md#addparty)
- [addPartyFeed](MetadataStore.md#addpartyfeed)
- [clear](MetadataStore.md#clear)
- [getParty](MetadataStore.md#getparty)
- [hasFeed](MetadataStore.md#hasfeed)
- [load](MetadataStore.md#load)
- [setDataFeed](MetadataStore.md#setdatafeed)
- [setGenesisFeed](MetadataStore.md#setgenesisfeed)
- [setTimeframe](MetadataStore.md#settimeframe)

## Constructors

### constructor

• **new MetadataStore**(`_directory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_directory` | `Directory` |

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:37](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L37)

## Properties

### \_metadata

• `Private` **\_metadata**: `EchoMetadata`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:35](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L35)

## Accessors

### parties

• `get` **parties**(): `PartyMetadata`[]

Returns a list of currently saved parties. The list and objects in it can be modified addParty and
addPartyFeed functions.

#### Returns

`PartyMetadata`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:49](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L49)

___

### version

• `get` **version**(): `number`

#### Returns

`number`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:41](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L41)

## Methods

### \_save

▸ `Private` **_save**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:85](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L85)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:122](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L122)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:138](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L138)

___

### clear

▸ **clear**(): `Promise`<`void`\>

Clears storage - doesn't work for now.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:114](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L114)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:178](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L178)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:185](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L185)

___

### load

▸ **load**(): `Promise`<`void`\>

Loads metadata from persistent storage.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:56](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L56)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:168](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L168)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:155](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L155)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:193](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/pipeline/metadata-store.ts#L193)

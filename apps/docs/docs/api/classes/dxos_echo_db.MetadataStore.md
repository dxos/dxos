---
id: "dxos_echo_db.MetadataStore"
title: "Class: MetadataStore"
sidebar_label: "MetadataStore"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).MetadataStore

## Constructors

### constructor

• **new MetadataStore**(`_directory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_directory` | `Directory` |

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:38](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L38)

## Properties

### \_metadata

• `Private` **\_metadata**: `EchoMetadata`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:36](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L36)

## Accessors

### parties

• `get` **parties**(): `PartyMetadata`[]

Returns a list of currently saved parties. The list and objects in it can be modified addParty and
addPartyFeed functions.

#### Returns

`PartyMetadata`[]

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:50](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L50)

___

### version

• `get` **version**(): `number`

#### Returns

`number`

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:42](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L42)

## Methods

### \_save

▸ `Private` **_save**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:86](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L86)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:123](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L123)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:139](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L139)

___

### clear

▸ **clear**(): `Promise`<`void`\>

Clears storage - doesn't work for now.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:115](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L115)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:179](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L179)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:186](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L186)

___

### load

▸ **load**(): `Promise`<`void`\>

Loads metadata from persistent storage.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/pipeline/metadata-store.ts:57](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L57)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:169](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L169)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:156](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L156)

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

[packages/echo/echo-db/src/pipeline/metadata-store.ts:194](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/pipeline/metadata-store.ts#L194)

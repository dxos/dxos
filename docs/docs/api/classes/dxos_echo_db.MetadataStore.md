# Class: MetadataStore

[@dxos/echo-db](../modules/dxos_echo_db.md).MetadataStore

## Constructors

### constructor

**new MetadataStore**(`_directory`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_directory` | `Directory` |

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:37](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L37)

## Properties

### \_metadata

 `Private` **\_metadata**: `EchoMetadata`

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:35](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L35)

## Accessors

### parties

`get` **parties**(): `PartyMetadata`[]

Returns a list of currently saved parties. The list and objects in it can be modified addParty and
addPartyFeed functions.

#### Returns

`PartyMetadata`[]

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:49](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L49)

___

### version

`get` **version**(): `number`

#### Returns

`number`

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L41)

## Methods

### \_save

`Private` **_save**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:85](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L85)

___

### addSpace

**addSpace**(`record`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `PartyMetadata` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:130](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L130)

___

### clear

**clear**(): `Promise`<`void`\>

Clears storage - doesn't work for now.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:114](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L114)

___

### getIdentityRecord

**getIdentityRecord**(): `undefined` \| `IdentityRecord`

#### Returns

`undefined` \| `IdentityRecord`

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:119](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L119)

___

### load

**load**(): `Promise`<`void`\>

Loads metadata from persistent storage.

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:56](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L56)

___

### setIdentityRecord

**setIdentityRecord**(`record`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `record` | `IdentityRecord` |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts:123](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/metadata/metadata-store.ts#L123)

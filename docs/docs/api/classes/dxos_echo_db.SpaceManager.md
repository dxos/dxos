# Class: SpaceManager

[@dxos/echo-db](../modules/dxos_echo_db.md).SpaceManager

Manages a collection of ECHO (Data) Spaces.

## Constructors

### constructor

**new SpaceManager**(`_metadataStore`, `_feedStore`, `_networkManager`, `_keyring`, `_dataService`, `_signingContext`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |
| `_feedStore` | `FeedStore` |
| `_networkManager` | `NetworkManager` |
| `_keyring` | `Keyring` |
| `_dataService` | [`DataService`](dxos_echo_db.DataService.md) |
| `_signingContext` | [`SigningContext`](../interfaces/dxos_echo_db.SigningContext.md) |

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:44](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L44)

## Properties

### spaces

 `Readonly` **spaces**: `ComplexMap`<`PublicKey`, [`Space`](dxos_echo_db.Space.md)\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:41](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L41)

___

### update

 `Readonly` **update**: `Event`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:42](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L42)

## Methods

### \_constructSpace

`Private` **_constructSpace**(`metadata`): `Promise`<[`Space`](dxos_echo_db.Space.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `metadata` | `PartyMetadata` |

#### Returns

`Promise`<[`Space`](dxos_echo_db.Space.md)\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:132](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L132)

___

### \_insertSpace

`Private` **_insertSpace**(`space`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `space` | [`Space`](dxos_echo_db.Space.md) |

#### Returns

`void`

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:126](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L126)

___

### acceptSpace

**acceptSpace**(`opts`): `Promise`<[`Space`](dxos_echo_db.Space.md)\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `opts` | [`AcceptSpaceOptions`](../interfaces/dxos_echo_db.AcceptSpaceOptions.md) |

#### Returns

`Promise`<[`Space`](dxos_echo_db.Space.md)\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:112](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L112)

___

### close

**close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:64](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L64)

___

### createSpace

**createSpace**(): `Promise`<[`Space`](dxos_echo_db.Space.md)\>

Creates a new space writing the genesis credentials to the control feed.

#### Returns

`Promise`<[`Space`](dxos_echo_db.Space.md)\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:71](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L71)

___

### open

**open**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/core/echo/echo-db/src/packlets/space/space-manager.ts:53](https://github.com/dxos/dxos/blob/main/packages/core/echo/echo-db/src/packlets/space/space-manager.ts#L53)

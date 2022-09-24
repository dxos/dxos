# Class: IdentityManager

[@dxos/echo-db](../modules/dxos_echo_db.md).IdentityManager

Manages the keyring and HALO party.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.IdentityManager.md#constructor)

### Properties

- [\_identity](dxos_echo_db.IdentityManager.md#_identity)
- [ready](dxos_echo_db.IdentityManager.md#ready)

### Accessors

- [identity](dxos_echo_db.IdentityManager.md#identity)

### Methods

- [\_initialize](dxos_echo_db.IdentityManager.md#_initialize)
- [close](dxos_echo_db.IdentityManager.md#close)
- [createHalo](dxos_echo_db.IdentityManager.md#createhalo)
- [getIdentityKey](dxos_echo_db.IdentityManager.md#getidentitykey)
- [joinHalo](dxos_echo_db.IdentityManager.md#joinhalo)
- [loadFromStorage](dxos_echo_db.IdentityManager.md#loadfromstorage)
- [recoverHalo](dxos_echo_db.IdentityManager.md#recoverhalo)

## Constructors

### constructor

• **new IdentityManager**(`_keyring`, `_haloFactory`, `_metadataStore`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_keyring` | `Keyring` |
| `_haloFactory` | [`HaloFactory`](dxos_echo_db.HaloFactory.md) |
| `_metadataStore` | [`MetadataStore`](dxos_echo_db.MetadataStore.md) |

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:29](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L29)

## Properties

### \_identity

• `Private` **\_identity**: `undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:25](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L25)

___

### ready

• `Readonly` **ready**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:27](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L27)

## Accessors

### identity

• `get` **identity**(): `undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Returns

`undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:35](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L35)

## Methods

### \_initialize

▸ `Private` **_initialize**(`halo`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `halo` | [`HaloParty`](dxos_echo_db.HaloParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:39](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L39)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:53](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L53)

___

### createHalo

▸ **createHalo**(`options?`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Creates the Identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`HaloCreationOptions`](../interfaces/dxos_echo_db.HaloCreationOptions.md) |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:88](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L88)

___

### getIdentityKey

▸ **getIdentityKey**(): `undefined` \| `KeyRecord`

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:60](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L60)

___

### joinHalo

▸ **joinHalo**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Joins an existing Identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:120](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L120)

___

### loadFromStorage

▸ **loadFromStorage**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:64](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L64)

___

### recoverHalo

▸ **recoverHalo**(`seedPhrase`): `Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

Joins an existing Identity HALO from a recovery seed phrase.
TODO(telackey): Combine with joinHalo?
  joinHalo({ seedPhrase }) // <- Recovery version
  joinHalo({ invitationDescriptor, secretProvider}) // <- Standard invitation version
The downside is that would wreck the symmetry to createParty/joinParty.

#### Parameters

| Name | Type |
| :------ | :------ |
| `seedPhrase` | `string` |

#### Returns

`Promise`<[`HaloParty`](dxos_echo_db.HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:108](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/identity-manager.ts#L108)

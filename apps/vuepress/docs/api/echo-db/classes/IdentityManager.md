# Class: IdentityManager

Manages the keyring and HALO party.

## Table of contents

### Constructors

- [constructor](IdentityManager.md#constructor)

### Properties

- [\_identity](IdentityManager.md#_identity)
- [ready](IdentityManager.md#ready)

### Accessors

- [identity](IdentityManager.md#identity)

### Methods

- [\_initialize](IdentityManager.md#_initialize)
- [close](IdentityManager.md#close)
- [createHalo](IdentityManager.md#createhalo)
- [getIdentityKey](IdentityManager.md#getidentitykey)
- [joinHalo](IdentityManager.md#joinhalo)
- [loadFromStorage](IdentityManager.md#loadfromstorage)
- [recoverHalo](IdentityManager.md#recoverhalo)

## Constructors

### constructor

• **new IdentityManager**(`_keyring`, `_haloFactory`, `_metadataStore`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_keyring` | `Keyring` |
| `_haloFactory` | [`HaloFactory`](HaloFactory.md) |
| `_metadataStore` | [`MetadataStore`](MetadataStore.md) |

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:29](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L29)

## Properties

### \_identity

• `Private` **\_identity**: `undefined` \| [`Identity`](Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:25](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L25)

___

### ready

• `Readonly` **ready**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L27)

## Accessors

### identity

• `get` **identity**(): `undefined` \| [`Identity`](Identity.md)

#### Returns

`undefined` \| [`Identity`](Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:35](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L35)

## Methods

### \_initialize

▸ `Private` **_initialize**(`halo`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `halo` | [`HaloParty`](HaloParty.md) |

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:39](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L39)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:53](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L53)

___

### createHalo

▸ **createHalo**(`options?`): `Promise`<[`HaloParty`](HaloParty.md)\>

Creates the Identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`HaloCreationOptions`](../interfaces/HaloCreationOptions.md) |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:88](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L88)

___

### getIdentityKey

▸ **getIdentityKey**(): `undefined` \| `KeyRecord`

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:60](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L60)

___

### joinHalo

▸ **joinHalo**(`invitationDescriptor`, `secretProvider`): `Promise`<[`HaloParty`](HaloParty.md)\>

Joins an existing Identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](InvitationDescriptor.md) |
| `secretProvider` | `SecretProvider` |

#### Returns

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:120](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L120)

___

### loadFromStorage

▸ **loadFromStorage**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:64](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L64)

___

### recoverHalo

▸ **recoverHalo**(`seedPhrase`): `Promise`<[`HaloParty`](HaloParty.md)\>

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

`Promise`<[`HaloParty`](HaloParty.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:108](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/identity-manager.ts#L108)

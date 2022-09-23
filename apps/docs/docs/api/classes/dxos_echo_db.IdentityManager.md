---
id: "dxos_echo_db.IdentityManager"
title: "Class: IdentityManager"
sidebar_label: "IdentityManager"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).IdentityManager

Manages the keyring and HALO party.

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

[packages/echo/echo-db/src/halo/identity-manager.ts:28](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L28)

## Properties

### \_identity

• `Private` **\_identity**: `undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:24](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L24)

___

### ready

• `Readonly` **ready**: `Event`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:26](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L26)

## Accessors

### identity

• `get` **identity**(): `undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Returns

`undefined` \| [`Identity`](dxos_echo_db.Identity.md)

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:34](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L34)

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

[packages/echo/echo-db/src/halo/identity-manager.ts:38](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L38)

___

### close

▸ **close**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:52](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L52)

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

[packages/echo/echo-db/src/halo/identity-manager.ts:87](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L87)

___

### getIdentityKey

▸ **getIdentityKey**(): `undefined` \| `KeyRecord`

#### Returns

`undefined` \| `KeyRecord`

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:59](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L59)

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

[packages/echo/echo-db/src/halo/identity-manager.ts:119](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L119)

___

### loadFromStorage

▸ **loadFromStorage**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[packages/echo/echo-db/src/halo/identity-manager.ts:63](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L63)

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

[packages/echo/echo-db/src/halo/identity-manager.ts:107](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/halo/identity-manager.ts#L107)

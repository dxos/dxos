# Class: ContactManager

[@dxos/echo-db](../modules/dxos_echo_db.md).ContactManager

Manages contacts.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.ContactManager.md#constructor)

### Methods

- [getContactListItem](dxos_echo_db.ContactManager.md#getcontactlistitem)
- [queryContacts](dxos_echo_db.ContactManager.md#querycontacts)

## Constructors

### constructor

• **new ContactManager**(`_getDatabase`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_getDatabase` | () => `undefined` \| [`Database`](dxos_echo_db.Database.md) |

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:23](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/contact-manager.ts#L23)

## Methods

### getContactListItem

▸ **getContactListItem**(): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>

#### Returns

`undefined` \| [`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:27](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/contact-manager.ts#L27)

___

### queryContacts

▸ **queryContacts**(): [`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Returns

[`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:32](https://github.com/dxos/dxos/blob/e3b936721/packages/echo/echo-db/src/halo/contact-manager.ts#L32)

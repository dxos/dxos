---
id: "dxos_echo_db.ContactManager"
title: "Class: ContactManager"
sidebar_label: "ContactManager"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).ContactManager

Manages contacts.

## Constructors

### constructor

• **new ContactManager**(`_getDatabase`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_getDatabase` | () => `undefined` \| [`Database`](dxos_echo_db.Database.md) |

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:23](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/halo/contact-manager.ts#L23)

## Methods

### getContactListItem

▸ **getContactListItem**(): `undefined` \| [`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>

#### Returns

`undefined` \| [`Item`](dxos_echo_db.Item.md)<`ObjectModel`\>

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:27](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/halo/contact-manager.ts#L27)

___

### queryContacts

▸ **queryContacts**(): [`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Returns

[`ResultSet`](dxos_echo_db.ResultSet.md)<[`PartyMember`](../interfaces/dxos_echo_db.PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:32](https://github.com/dxos/protocols/blob/c793f0fed/packages/echo/echo-db/src/halo/contact-manager.ts#L32)

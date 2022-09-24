# Class: ContactManager

Manages contacts.

## Table of contents

### Constructors

- [constructor](ContactManager.md#constructor)

### Methods

- [getContactListItem](ContactManager.md#getcontactlistitem)
- [queryContacts](ContactManager.md#querycontacts)

## Constructors

### constructor

• **new ContactManager**(`_getDatabase`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_getDatabase` | () => `undefined` \| [`Database`](Database.md) |

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:23](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/contact-manager.ts#L23)

## Methods

### getContactListItem

▸ **getContactListItem**(): `undefined` \| [`Item`](Item.md)<`ObjectModel`\>

#### Returns

`undefined` \| [`Item`](Item.md)<`ObjectModel`\>

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:27](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/contact-manager.ts#L27)

___

### queryContacts

▸ **queryContacts**(): [`ResultSet`](ResultSet.md)<[`PartyMember`](../interfaces/PartyMember.md)\>

#### Returns

[`ResultSet`](ResultSet.md)<[`PartyMember`](../interfaces/PartyMember.md)\>

#### Defined in

[packages/echo/echo-db/src/halo/contact-manager.ts:32](https://github.com/dxos/dxos/blob/6b1348fed/packages/echo/echo-db/src/halo/contact-manager.ts#L32)

---
id: "dxos_echo_db.InvitationDescriptor"
title: "Class: InvitationDescriptor"
sidebar_label: "InvitationDescriptor"
custom_edit_url: null
---

[@dxos/echo-db](../modules/dxos_echo_db.md).InvitationDescriptor

Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors

### constructor

• **new InvitationDescriptor**(`type`, `swarmKey`, `invitation`, `identityKey?`, `secret?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | [`InvitationDescriptorType`](../enums/dxos_echo_db.InvitationDescriptorType.md) |
| `swarmKey` | `Uint8Array` |
| `invitation` | `Uint8Array` |
| `identityKey?` | `PublicKey` |
| `secret?` | `Uint8Array` |

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:79](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L79)

## Properties

### identityKey

• `Optional` `Readonly` **identityKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:83](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L83)

___

### invitation

• `Readonly` **invitation**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:82](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L82)

___

### secret

• `Optional` **secret**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:84](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L84)

___

### swarmKey

• `Readonly` **swarmKey**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:81](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L81)

___

### type

• `Readonly` **type**: [`InvitationDescriptorType`](../enums/dxos_echo_db.InvitationDescriptorType.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:80](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L80)

## Accessors

### hash

• `get` **hash**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:97](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L97)

## Methods

### encode

▸ **encode**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:131](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L131)

___

### toProto

▸ **toProto**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:121](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L121)

___

### toQueryParameters

▸ **toQueryParameters**(): [`InvitationQueryParameters`](../interfaces/dxos_echo_db.InvitationQueryParameters.md)

Exports an InvitationDescriptor to an object suitable for use as query parameters.

#### Returns

[`InvitationQueryParameters`](../interfaces/dxos_echo_db.InvitationQueryParameters.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:105](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L105)

___

### decode

▸ `Static` **decode**(`code`): [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `string` |

#### Returns

[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:73](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L73)

___

### fromProto

▸ `Static` **fromProto**(`protoInvitation`): [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `protoInvitation` | `InvitationDescriptor` |

#### Returns

[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:59](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L59)

___

### fromQueryParameters

▸ `Static` **fromQueryParameters**(`queryParameters`): [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `queryParameters` | [`InvitationQueryParameters`](../interfaces/dxos_echo_db.InvitationQueryParameters.md) |

#### Returns

[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:46](https://github.com/dxos/protocols/blob/6f4c34af3/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L46)

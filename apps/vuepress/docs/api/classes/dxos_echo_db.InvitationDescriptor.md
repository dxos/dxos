# Class: InvitationDescriptor

[@dxos/echo-db](../modules/dxos_echo_db.md).InvitationDescriptor

Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Table of contents

### Constructors

- [constructor](dxos_echo_db.InvitationDescriptor.md#constructor)

### Properties

- [identityKey](dxos_echo_db.InvitationDescriptor.md#identitykey)
- [invitation](dxos_echo_db.InvitationDescriptor.md#invitation)
- [secret](dxos_echo_db.InvitationDescriptor.md#secret)
- [swarmKey](dxos_echo_db.InvitationDescriptor.md#swarmkey)
- [type](dxos_echo_db.InvitationDescriptor.md#type)

### Accessors

- [hash](dxos_echo_db.InvitationDescriptor.md#hash)

### Methods

- [encode](dxos_echo_db.InvitationDescriptor.md#encode)
- [toProto](dxos_echo_db.InvitationDescriptor.md#toproto)
- [toQueryParameters](dxos_echo_db.InvitationDescriptor.md#toqueryparameters)
- [decode](dxos_echo_db.InvitationDescriptor.md#decode)
- [fromProto](dxos_echo_db.InvitationDescriptor.md#fromproto)
- [fromQueryParameters](dxos_echo_db.InvitationDescriptor.md#fromqueryparameters)

## Constructors

### constructor

• **new InvitationDescriptor**(`type`, `swarmKey`, `invitation`, `identityKey?`, `secret?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `Type` |
| `swarmKey` | `Uint8Array` |
| `invitation` | `Uint8Array` |
| `identityKey?` | `PublicKey` |
| `secret?` | `Uint8Array` |

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:72](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L72)

## Properties

### identityKey

• `Optional` `Readonly` **identityKey**: `PublicKey`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:76](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L76)

___

### invitation

• `Readonly` **invitation**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:75](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L75)

___

### secret

• `Optional` **secret**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:77](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L77)

___

### swarmKey

• `Readonly` **swarmKey**: `Uint8Array`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:74](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L74)

___

### type

• `Readonly` **type**: `Type`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:73](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L73)

## Accessors

### hash

• `get` **hash**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:90](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L90)

## Methods

### encode

▸ **encode**(): `string`

#### Returns

`string`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:124](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L124)

___

### toProto

▸ **toProto**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:114](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L114)

___

### toQueryParameters

▸ **toQueryParameters**(): [`InvitationQueryParameters`](../interfaces/dxos_echo_db.InvitationQueryParameters.md)

Exports an InvitationDescriptor to an object suitable for use as query parameters.

#### Returns

[`InvitationQueryParameters`](../interfaces/dxos_echo_db.InvitationQueryParameters.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:98](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L98)

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

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:66](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L66)

___

### fromProto

▸ `Static` **fromProto**(`invitation`): [`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | `InvitationDescriptor` |

#### Returns

[`InvitationDescriptor`](dxos_echo_db.InvitationDescriptor.md)

#### Defined in

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:52](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L52)

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

[packages/echo/echo-db/src/invitations/invitation-descriptor.ts:39](https://github.com/dxos/dxos/blob/32ae9b579/packages/echo/echo-db/src/invitations/invitation-descriptor.ts#L39)

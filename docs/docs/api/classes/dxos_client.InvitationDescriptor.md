# Class: InvitationDescriptor

[@dxos/client](../modules/dxos_client.md).InvitationDescriptor

Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors

### constructor

**new InvitationDescriptor**(`type`, `swarmKey`, `invitation`, `identityKey?`, `secret?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `Type` |
| `swarmKey` | `Uint8Array` |
| `invitation` | `Uint8Array` |
| `identityKey?` | `PublicKey` |
| `secret?` | `Uint8Array` |

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:31

## Properties

### identityKey

 `Optional` `Readonly` **identityKey**: `PublicKey`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:26

___

### invitation

 `Readonly` **invitation**: `Uint8Array`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:25

___

### secret

 `Optional` **secret**: `Uint8Array`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:27

___

### swarmKey

 `Readonly` **swarmKey**: `Uint8Array`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:24

___

### type

 `Readonly` **type**: `Type`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:23

## Accessors

### hash

`get` **hash**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:32

## Methods

### encode

**encode**(): `string`

#### Returns

`string`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:38

___

### toProto

**toProto**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:37

___

### toQueryParameters

**toQueryParameters**(): `InvitationQueryParameters`

Exports an InvitationDescriptor to an object suitable for use as query parameters.

#### Returns

`InvitationQueryParameters`

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:36

___

### decode

`Static` **decode**(`code`): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `string` |

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:30

___

### fromProto

`Static` **fromProto**(`invitation`): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | `InvitationDescriptor` |

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:29

___

### fromQueryParameters

`Static` **fromQueryParameters**(`queryParameters`): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `queryParameters` | `InvitationQueryParameters` |

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

packages/echo/echo-db/dist/src/invitations/invitation-descriptor.d.ts:28

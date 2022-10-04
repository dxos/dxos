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
| `swarmKey` | [`PublicKey`](dxos_client.PublicKey.md) |
| `invitation` | `Uint8Array` |
| `identityKey?` | [`PublicKey`](dxos_client.PublicKey.md) |
| `secret?` | `Uint8Array` |

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:30

## Properties

### identityKey

 `Optional` `Readonly` **identityKey**: [`PublicKey`](dxos_client.PublicKey.md)

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:25

___

### invitation

 `Readonly` **invitation**: `Uint8Array`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:24

___

### secret

 `Optional` **secret**: `Uint8Array`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:26

___

### swarmKey

 `Readonly` **swarmKey**: [`PublicKey`](dxos_client.PublicKey.md)

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:23

___

### type

 `Readonly` **type**: `Type`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:22

## Accessors

### hash

`get` **hash**(): `string`

#### Returns

`string`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:31

## Methods

### encode

**encode**(): `string`

#### Returns

`string`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:37

___

### toProto

**toProto**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:36

___

### toQueryParameters

**toQueryParameters**(): `InvitationQueryParameters`

Exports an InvitationDescriptor to an object suitable for use as query parameters.

#### Returns

`InvitationQueryParameters`

#### Defined in

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:35

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

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:29

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

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:28

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

packages/sdk/client-services/dist/src/packlets/invitations/invitation-descriptor.d.ts:27

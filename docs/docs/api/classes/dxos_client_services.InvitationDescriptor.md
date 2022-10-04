# Class: InvitationDescriptor

[@dxos/client-services](../modules/dxos_client_services.md).InvitationDescriptor

Describes an issued invitation.

Can be serialized to protobuf or JSON.
Invitations can be interactive or offline.

This descriptor might also have a bundled secret for authentication in interactive mode.

## Constructors

### constructor

**new InvitationDescriptor**(`type`, `swarm_key`, `invitation`, `identity_key?`, `secret?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `type` | `Type` |
| `swarm_key` | `PublicKey` |
| `invitation` | `Uint8Array` |
| `identity_key?` | `PublicKey` |
| `secret?` | `Uint8Array` |

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:73](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L73)

## Properties

### identity_key

 `Optional` `Readonly` **identity_key**: `PublicKey`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:77](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L77)

___

### invitation

 `Readonly` **invitation**: `Uint8Array`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:76](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L76)

___

### secret

 `Optional` **secret**: `Uint8Array`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:78](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L78)

___

### swarm_key

 `Readonly` **swarm_key**: `PublicKey`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:75](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L75)

___

### type

 `Readonly` **type**: `Type`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:74](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L74)

## Accessors

### hash

`get` **hash**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:91](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L91)

## Methods

### encode

**encode**(): `string`

#### Returns

`string`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:126](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L126)

___

### toProto

**toProto**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:115](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L115)

___

### toQueryParameters

**toQueryParameters**(): [`InvitationQueryParameters`](../interfaces/dxos_client_services.InvitationQueryParameters.md)

Exports an InvitationDescriptor to an object suitable for use as query parameters.

#### Returns

[`InvitationQueryParameters`](../interfaces/dxos_client_services.InvitationQueryParameters.md)

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:99](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L99)

___

### decode

`Static` **decode**(`code`): [`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `code` | `string` |

#### Returns

[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:67](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L67)

___

### fromProto

`Static` **fromProto**(`invitation`): [`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitation` | `InvitationDescriptor` |

#### Returns

[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:52](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L52)

___

### fromQueryParameters

`Static` **fromQueryParameters**(`queryParameters`): [`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `queryParameters` | [`InvitationQueryParameters`](../interfaces/dxos_client_services.InvitationQueryParameters.md) |

#### Returns

[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts:39](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/invitation-descriptor.ts#L39)

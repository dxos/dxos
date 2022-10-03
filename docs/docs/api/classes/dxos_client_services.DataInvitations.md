# Class: DataInvitations

[@dxos/client-services](../modules/dxos_client_services.md).DataInvitations

Create and manage data invitations for Data spaces.

## Constructors

### constructor

**new DataInvitations**(`_networkManager`, `_signingContext`, `_spaceManager`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_signingContext` | `SigningContext` |
| `_spaceManager` | `SpaceManager` |

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/data-invitations.ts:24](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/data-invitations.ts#L24)

## Methods

### acceptInvitation

**acceptInvitation**(`invitationDescriptor`): `Promise`<`Space`\>

Joins an existing identity HALO by invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md) |

#### Returns

`Promise`<`Space`\>

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/data-invitations.ts:116](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/data-invitations.ts#L116)

___

### createInvitation

**createInvitation**(`space`, `__namedParameters?`): `Promise`<[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)\>

Create an invitation to an exiting identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `space` | `Space` |
| `__namedParameters` | `Object` |
| `__namedParameters.onFinish?` | () => `void` |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/data-invitations.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/data-invitations.ts#L33)

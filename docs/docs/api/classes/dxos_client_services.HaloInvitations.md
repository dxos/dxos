# Class: HaloInvitations

[@dxos/client-services](../modules/dxos_client_services.md).HaloInvitations

Create and process Halo (space) invitations for device management.

## Constructors

### constructor

**new HaloInvitations**(`_networkManager`, `_identityManager`, `_onInitialize`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_networkManager` | `NetworkManager` |
| `_identityManager` | [`IdentityManager`](dxos_client_services.IdentityManager.md) |
| `_onInitialize` | () => `Promise`<`void`\> |

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts:24](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L24)

## Methods

### acceptInvitation

**acceptInvitation**(`invitationDescriptor`): `Promise`<[`Identity`](dxos_client_services.Identity.md)\>

Joins an existing identity HALO by invitation.

#### Parameters

| Name | Type |
| :------ | :------ |
| `invitationDescriptor` | [`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md) |

#### Returns

`Promise`<[`Identity`](dxos_client_services.Identity.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts:92](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L92)

___

### createInvitation

**createInvitation**(`__namedParameters?`): `Promise`<[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)\>

Create an invitation to an exiting identity HALO.

#### Parameters

| Name | Type |
| :------ | :------ |
| `__namedParameters` | `Object` |
| `__namedParameters.onFinish?` | () => `void` |

#### Returns

`Promise`<[`InvitationDescriptor`](dxos_client_services.InvitationDescriptor.md)\>

#### Defined in

[packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts:33](https://github.com/dxos/dxos/blob/main/packages/sdk/client-services/src/packlets/invitations/halo-invitations.ts#L33)

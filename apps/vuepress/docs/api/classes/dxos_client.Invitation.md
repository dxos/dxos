# Class: Invitation<T\>

[@dxos/client](../modules/dxos_client.md).Invitation

Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `void` |

## Hierarchy

- **`Invitation`**

  ↳ [`PartyInvitation`](dxos_client.PartyInvitation.md)

## Constructors

### constructor

**new Invitation**<`T`\>(`_descriptor`, `_invitationPromise`, `_onAuthenticate`)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | `void` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `_descriptor` | [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md) |
| `_invitationPromise` | `Promise`<`T`\> |
| `_onAuthenticate` | (`secret`: `Uint8Array`) => `void` |

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:13](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L13)

## Properties

### \_descriptor

 `Protected` `Readonly` **\_descriptor**: [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:14](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L14)

___

### \_invitationPromise

 `Protected` `Readonly` **\_invitationPromise**: `Promise`<`T`\>

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:15](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L15)

___

### \_onAuthenticate

 `Protected` `Readonly` **\_onAuthenticate**: (`secret`: `Uint8Array`) => `void`

#### Type declaration

(`secret`): `void`

##### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Uint8Array` |

##### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:16](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L16)

## Accessors

### descriptor

`get` **descriptor**(): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:19](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L19)

## Methods

### authenticate

**authenticate**(`secret`): `void`

#### Parameters

| Name | Type |
| :------ | :------ |
| `secret` | `Uint8Array` |

#### Returns

`void`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:24](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L24)

___

### toJSON

**toJSON**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:35](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L35)

___

### wait

**wait**(): `Promise`<`T`\>

Wait for the invitation flow to complete.

#### Returns

`Promise`<`T`\>

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:31](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L31)

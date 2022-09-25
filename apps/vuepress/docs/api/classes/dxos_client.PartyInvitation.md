# Class: PartyInvitation

[@dxos/client](../modules/dxos_client.md).PartyInvitation

Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Hierarchy

- [`Invitation`](dxos_client.Invitation.md)<[`Party`](../interfaces/dxos_client.Party.md)\>

  ↳ **`PartyInvitation`**

## Constructors

### constructor

**new PartyInvitation**(`_descriptor`, `_invitationPromise`, `_onAuthenticate`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `_descriptor` | [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md) |
| `_invitationPromise` | `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\> |
| `_onAuthenticate` | (`secret`: `Uint8Array`) => `void` |

#### Inherited from

[Invitation](dxos_client.Invitation.md).[constructor](dxos_client.Invitation.md#constructor)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:13](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L13)

## Properties

### \_descriptor

 `Protected` `Readonly` **\_descriptor**: [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Inherited from

[Invitation](dxos_client.Invitation.md).[_descriptor](dxos_client.Invitation.md#_descriptor)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:14](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L14)

___

### \_invitationPromise

 `Protected` `Readonly` **\_invitationPromise**: `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Inherited from

[Invitation](dxos_client.Invitation.md).[_invitationPromise](dxos_client.Invitation.md#_invitationpromise)

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

#### Inherited from

[Invitation](dxos_client.Invitation.md).[_onAuthenticate](dxos_client.Invitation.md#_onauthenticate)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:16](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L16)

## Accessors

### descriptor

`get` **descriptor**(): [`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Returns

[`InvitationDescriptor`](dxos_client.InvitationDescriptor.md)

#### Inherited from

Invitation.descriptor

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

#### Inherited from

[Invitation](dxos_client.Invitation.md).[authenticate](dxos_client.Invitation.md#authenticate)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:24](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L24)

___

### getParty

**getParty**(): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

Wait for the invitation flow to complete and return the target party.

#### Returns

`Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Defined in

[packages/sdk/client/src/packlets/api/echo.ts:72](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/echo.ts#L72)

___

### toJSON

**toJSON**(): `InvitationDescriptor`

#### Returns

`InvitationDescriptor`

#### Inherited from

[Invitation](dxos_client.Invitation.md).[toJSON](dxos_client.Invitation.md#tojson)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:35](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L35)

___

### wait

**wait**(): `Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

Wait for the invitation flow to complete.

#### Returns

`Promise`<[`Party`](../interfaces/dxos_client.Party.md)\>

#### Inherited from

[Invitation](dxos_client.Invitation.md).[wait](dxos_client.Invitation.md#wait)

#### Defined in

[packages/sdk/client/src/packlets/api/invitations/invitation.ts:31](https://github.com/dxos/dxos/blob/db8188dae/packages/sdk/client/src/packlets/api/invitations/invitation.ts#L31)

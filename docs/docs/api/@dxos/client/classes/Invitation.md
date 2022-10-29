# Class `Invitation`
Declared in [`packages/sdk/client/src/packlets/api/invitation.ts:12`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L12)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L13)


Returns: [`Invitation`](/api/@dxos/client/classes/Invitation)`<T>`

Arguments: 

`_descriptor`: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

`_invitationPromise`: `Promise<T>`

`_onAuthenticate`: `function`

## Properties
### [`_descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L14)
Type: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)
### [`_invitationPromise`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L15)
Type: `Promise<T>`
### [`_onAuthenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L16)
Type: `function`
### [`descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L19)
Type: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

## Methods
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L24)


Returns: `void`

Arguments: 

`secret`: `Uint8Array`
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L35)


Returns: `InvitationDescriptor`

Arguments: none
### [`wait`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L31)


Wait for the invitation flow to complete.

Returns: `Promise<T>`

Arguments: none
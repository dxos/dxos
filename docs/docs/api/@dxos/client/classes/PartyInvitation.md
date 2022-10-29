# Class `PartyInvitation`
Declared in [`packages/sdk/client/src/packlets/api/echo.ts:64`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L64)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L13)


Returns: [`PartyInvitation`](/api/@dxos/client/classes/PartyInvitation)

Arguments: 

`_descriptor`: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

`_invitationPromise`: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

`_onAuthenticate`: `function`

## Properties
### [`_descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L14)
Type: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)
### [`_invitationPromise`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L15)
Type: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`
### [`_onAuthenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L16)
Type: `function`
### [`descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L19)
Type: [`InvitationDescriptor`](/api/@dxos/client/classes/InvitationDescriptor)

## Methods
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L24)


Returns: `void`

Arguments: 

`secret`: `Uint8Array`
### [`getParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L68)


Wait for the invitation flow to complete and return the target party.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L35)


Returns: `InvitationDescriptor`

Arguments: none
### [`wait`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation.ts#L31)


Wait for the invitation flow to complete.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
# Class `PartyInvitation`
Declared in [`packages/sdk/client/src/packlets/api/echo.ts:64`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L64)


Invitation that is being redeemed.
It works in non-interactive mode and requires no authentication.

## Constructors
### [`constructor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L12)


Returns: [`PartyInvitation`](/api/@dxos/client/classes/PartyInvitation)

Arguments: 

`_descriptor`: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

`_invitationPromise`: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

`_onAuthenticate`: `function`

## Properties
### [`_descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L13)
Type: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)
### [`_invitationPromise`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L14)
Type: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`
### [`_onAuthenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L15)
Type: `function`
### [`descriptor`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L22)
Type: [`InvitationWrapper`](/api/@dxos/client/classes/InvitationWrapper)

## Methods
### [`authenticate`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L27)


Returns: `void`

Arguments: 

`secret`: `Uint8Array`
### [`getParty`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/echo.ts#L68)


Wait for the invitation flow to complete and return the target party.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none
### [`toJSON`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L18)


Returns: `any`

Arguments: none
### [`wait`](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/api/invitation-challenge.ts#L34)


Wait for the invitation flow to complete.

Returns: `Promise<`[`Party`](/api/@dxos/client/interfaces/Party)`>`

Arguments: none